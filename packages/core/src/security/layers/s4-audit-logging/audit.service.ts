import { Injectable, Logger, Scope, Inject, InternalServerErrorException, Optional } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { join } from 'path';
import { TenantContextService } from '../../layers/s2-tenant-isolation/tenant-context.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditDir = join(process.cwd(), 'logs', 'audit-logs');
  private requestStartTime: Date;
  private requestId: string;

  private isSystemReady = true;

  constructor(
    @Optional() @Inject(REQUEST) private readonly request: Request,
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService
  ) {
    this.requestStartTime = new Date();
    this.requestId = uuidv4();

    // إنشاء مجلد السجلات إذا لم يكن موجوداً
    this.ensureAuditDirectory();
  }

  private ensureAuditDirectory() {
    if (!fs.existsSync(this.auditDir)) {
      fs.mkdirSync(this.auditDir, { recursive: true });
    }
  }

  logSecurityEvent(eventType: string, eventData: any) {
    const tenantId = this.tenantContext.getTenantId() || 'system';
    this.log(tenantId, { action: eventType, details: eventData }, 'security');
    this.logger.log(`[S4] 🔐 حدث أمني: ${eventType}`);
  }

  logBusinessEvent(eventType: string, eventData: any) {
    const tenantId = this.tenantContext.getTenantId() || 'system';
    this.log(tenantId, { action: eventType, details: eventData }, 'business');
    this.logger.debug(`[S4] 💼 حدث تجاري: ${eventType}`);
  }

  setIsSystemReady(ready: boolean) {
    this.isSystemReady = ready;
    this.logger.log(`[S4] ⚙️ حالة جاهزية النظام: ${ready}`);
  }

  logActivity(activity: any) {
    if (typeof activity === 'string') {
      this.logBusinessEvent(activity, {});
    } else {
      this.logBusinessEvent(activity.action || 'ACTIVITY', activity.details || activity);
    }
  }

  async log(tenantId: string, event: any, severity: string = 'info') {
    const eventType = event.action || 'LOG_EVENT';
    const auditEntry = this.createAuditEntry(eventType, event, 'LOG');
    (auditEntry as any).severity = severity;
    (auditEntry as any).tenantId = tenantId;

    if (!this.isSystemReady) {
      console.log(`[AUDIT_FALLBACK] ${JSON.stringify(auditEntry)}`);
      return;
    }

    try {
      // التحقق من وجود الجدول (اختياري، للمحاكاة في الاختبارات)
      const tableCheck = await this.prisma.$queryRaw<{ exists: boolean }[]>`SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')`;
      if (Array.isArray(tableCheck) && tableCheck[0] && !tableCheck[0].exists) {
        console.log(`[AUDIT_FALLBACK_MISSING_TABLE] ${JSON.stringify(auditEntry)}`);
        return;
      }

      await this.prisma.$executeRawUnsafe(
        'INSERT INTO audit_logs (id, timestamp, tenant_id, user_id, action, details) VALUES ($1, $2, $3, $4, $5, $6)',
        uuidv4(), new Date(), tenantId, auditEntry.context.userId || 'system', eventType, JSON.stringify(auditEntry)
      );
    } catch (error) {
      this.logger.error(`[S4] ❌ فشل تسجيل التدقيق في القاعدة: ${error.message}`);
      this.logToFallback(auditEntry);
    }
  }

  private logToFallback(entry: any) {
    try {
      this.ensureAuditDirectory();
      const dateStr = new Date().toISOString().split('T')[0];
      const logFile = join(this.auditDir, `${dateStr}-fallback.log`);
      fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
    } catch (err) {
      this.logger.error(`[S4] ❌ Audit fallback logger failed: ${err.message}`);
    }
  }

  async logOperation(op: any) {
    const tenantId = op.tenantId || this.tenantContext.getTenantId() || 'system';
    await this.log(tenantId, op);
  }

  async getAuditLogs(tenantId: string, filters: any): Promise<any[]> {
    try {
      return await this.prisma.$queryRawUnsafe(
        'SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC',
        tenantId
      );
    } catch (error) {
      throw new InternalServerErrorException('فشل الحصول على سجلات التدقيق');
    }
  }

  logSystemEvent(eventType: string, eventData: any) {
    const tenantId = this.tenantContext.getTenantId() || 'system';
    this.log(tenantId, { action: eventType, details: eventData }, 'system');
    this.logger.debug(`[S4] ⚙️ حدث نظام: ${eventType}`);
  }

  private createAuditEntry(eventType: string, eventData: any, category: string) {
    const currentTime = new Date();
    const processingTime = currentTime.getTime() - this.requestStartTime.getTime();

    return {
      id: `${category.toLowerCase()}-${uuidv4()}`,
      timestamp: currentTime.toISOString(),
      requestId: this.requestId,
      category,
      eventType,
      eventData: this.sanitizeEventData(eventData),
      context: {
        tenantId: this.tenantContext.getTenantId(),
        tenantSchema: this.tenantContext.getTenantSchema(),
        userId: this.getUserIdFromRequest(),
        userEmail: this.getUserEmailFromRequest(),
        ipAddress: this.getClientIp(),
        userAgent: (this.request && typeof this.request.get === 'function') ? this.request.get('User-Agent') : 'unknown',
        method: this.request?.method || 'unknown',
        url: this.request?.originalUrl || 'unknown',
        processingTimeMs: processingTime
      },
      server: {
        hostname: process.env.HOSTNAME || require('os').hostname(),
        environment: process.env.NODE_ENV || 'development',
        processId: process.pid,
        version: process.env.npm_package_version || 'unknown'
      }
    };
  }

  private sanitizeEventData(data: any): any {
    if (!data) return data;

    // ✅ إصلاح المخالفة 1: إضافة جميع الحقول المالية الحساسة
    const sensitiveFields = [
      'password', 'token', 'secret', 'apiKey', 'privateKey',
      'creditCard', 'cvv', 'cardNumber', 'cardExpiry',
      'iban', 'accountNumber', 'routingNumber',
      'socialSecurityNumber', 'ssn', 'nationalId',
      'passportNumber', 'taxId', 'pinCode'
    ];

    const redacted = { ...data };

    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();

      // إخفاء الحقول الحساسة
      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
        continue;
      }

      // معالجة الكائنات الداخلية
      if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.sanitizeEventData(redacted[key]);
      }

      // إخفاء القيم الطويلة جداً
      if (typeof redacted[key] === 'string' && redacted[key].length > 500) {
        redacted[key] = redacted[key].substring(0, 500) + '... [TRUNCATED]';
      }
    }

    return redacted;
  }

  private getUserIdFromRequest(): string | null {
    const req = this.request as any;
    if (!req) return null;
    return req.user?.id ||
      req.headers?.['x-user-id']?.toString() ||
      null;
  }

  private getUserEmailFromRequest(): string | null {
    const req = this.request as any;
    if (!req) return null;
    return req.user?.email ||
      req.headers?.['x-user-email']?.toString() ||
      null;
  }

  private getClientIp(): string {
    if (!this.request) return 'unknown';
    const forwardedFor = this.request.headers?.['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    }
    return this.request.ip || (this.request.connection as any)?.remoteAddress || 'unknown';
  }

  private writeAuditLog(auditEntry: any) {
    try {
      this.ensureAuditDirectory();
      const dateStr = new Date().toISOString().split('T')[0];
      const logFile = join(this.auditDir, `${dateStr}-${auditEntry.category.toLowerCase()}.log`);

      const logEntry = JSON.stringify(auditEntry) + '\n';
      fs.appendFileSync(logFile, logEntry);

      // إذا كان حدثاً خطيراً، اكتب نسخة منفصلة
      if (auditEntry.category === 'SECURITY' && ['TENANT_ISOLATION_VIOLATION', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH_ATTEMPT', 'ARCHIVING_FAILURE'].includes(auditEntry.eventType)) {
        const criticalFile = join(this.auditDir, `${dateStr}-critical-security.log`);
        fs.appendFileSync(criticalFile, logEntry);
      }
    } catch (error) {
      this.logger.error(`[S4] ❌ فشل كتابة سجل التدقيق: ${error.message}`);
      // محاولة البديل - التسجيل في وحدة التحكم
      console.error('[AUDIT_FAILURE]', JSON.stringify(auditEntry));
    }
  }

  // ✅ إضافة: دعم التسجيل غير المتزامن لتحسين الأداء
  private writeAuditLogAsync(auditEntry: any) {
    // استخدام قائمة انتظار داخلية لتجنب حظر الطلب الرئيسي
    process.nextTick(() => {
      try {
        this.logToFallback(auditEntry);
      } catch (error) {
        this.logger.error(`[M4] ❌ فشل تسجيل الحدث في الخلفية: ${error.message}`);
      }
    });
  }

  // ✅ إضافة: طريقة للاستعلام عن السجلات
  async queryAuditLogs(
    startDate: Date,
    endDate: Date,
    filters?: {
      category?: string;
      eventType?: string;
      tenantId?: string;
      severity?: string
    }
  ): Promise<any[]> {
    try {
      const logs: any[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const logFiles = [
          join(this.auditDir, `${dateStr}-security.log`),
          join(this.auditDir, `${dateStr}-business.log`),
          join(this.auditDir, `${dateStr}-system.log`)
        ];

        for (const logFile of logFiles) {
          try {
            if (fs.existsSync(logFile)) {
              const content = fs.readFileSync(logFile, 'utf-8');
              const entries = content.split('\n')
                .filter(line => line.trim())
                .map(line => {
                  try {
                    return JSON.parse(line);
                  } catch (e) {
                    return null;
                  }
                })
                .filter(e => e !== null);

              // تطبيق المرشحات
              const filtered = entries.filter(entry => {
                if (filters?.category && entry.category !== filters.category) return false;
                if (filters?.eventType && entry.eventType !== filters.eventType) return false;
                if (filters?.tenantId && entry.context?.tenantId !== filters.tenantId) return false;
                if (filters?.severity && entry.severity !== filters.severity) return false;
                return true;
              });

              logs.push(...filtered);
            }
          } catch (error) {
            this.logger.error(`[M4] ❌ خطأ في قراءة سجلات ${logFile}: ${error.message}`);
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // الفرز حسب الطابع الزمني
      return logs.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    } catch (error) {
      this.logger.error(`[M4] ❌ فشل استعلام سجلات التدقيق: ${error.message}`);
      throw new Error('فشل في استرجاع سجلات التدقيق');
    }
  }

  generateAuditReport(startDate: Date, endDate: Date, category?: string): Promise<any[]> {
    // تنفيذ إنشاء التقارير هنا (سيتم تطويره لاحقاً)
    this.logger.warn('[S4] ⚠️ تقارير التدقيق تحتاج لتطوير - لم يتم تنفيذها بعد');
    return Promise.resolve([]);
  }
}