import { Injectable, Logger, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import { join } from 'path';
import { TenantContextService } from '../../layers/s2-tenant-isolation/tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly auditDir = join(process.cwd(), 'logs', 'audit-logs');
  private requestStartTime: Date;
  private requestId: string;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly tenantContext: TenantContextService
  ) {
    this.requestStartTime = new Date();
    this.requestId = uuidv4();

    // إنشاء مجلد السجلات إذا لم يكن موجوداً
    this.ensureAuditDirectory();
  }

  private async ensureAuditDirectory() {
    try {
      await fs.mkdir(this.auditDir, { recursive: true });
    } catch (error) {
      this.logger.error(`[S4] ❌ فشل إنشاء مجلد السجلات: ${error.message}`);
    }
  }

  logSecurityEvent(eventType: string, eventData: any) {
    const auditEntry = this.createAuditEntry(eventType, eventData, 'SECURITY');
    this.writeAuditLog(auditEntry);

    this.logger.log(`[S4] 🔐 حدث أمني: ${eventType}`);
    this.logger.debug(JSON.stringify(auditEntry, null, 2));
  }

  logBusinessEvent(eventType: string, eventData: any) {
    const auditEntry = this.createAuditEntry(eventType, eventData, 'BUSINESS');
    this.writeAuditLog(auditEntry);

    this.logger.debug(`[S4] 💼 حدث تجاري: ${eventType}`);
  }

  logSystemEvent(eventType: string, eventData: any) {
    const auditEntry = this.createAuditEntry(eventType, eventData, 'SYSTEM');
    this.writeAuditLog(auditEntry);

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
    return req.user?.id ||
      req.headers['x-user-id']?.toString() ||
      null;
  }

  private getUserEmailFromRequest(): string | null {
    const req = this.request as any;
    return req.user?.email ||
      req.headers['x-user-email']?.toString() ||
      null;
  }

  private getClientIp(): string {
    const forwardedFor = this.request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    }
    return this.request.ip || this.request.connection.remoteAddress || 'unknown';
  }

  private async writeAuditLog(auditEntry: any) {
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const logFile = join(this.auditDir, `${dateStr}-${auditEntry.category.toLowerCase()}.log`);

      const logEntry = JSON.stringify(auditEntry) + '\n';
      await fs.appendFile(logFile, logEntry);

      // إذا كان حدثاً خطيراً، اكتب نسخة منفصلة
      if (auditEntry.category === 'SECURITY' && ['TENANT_ISOLATION_VIOLATION', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH_ATTEMPT', 'ARCHIVING_FAILURE'].includes(auditEntry.eventType)) {
        const criticalFile = join(this.auditDir, `${dateStr}-critical-security.log`);
        await fs.appendFile(criticalFile, logEntry);
      }
    } catch (error) {
      this.logger.error(`[S4] ❌ فشل كتابة سجل التدقيق: ${error.message}`);
      // محاولة البديل - التسجيل في وحدة التحكم
      console.error('[AUDIT_FAILURE]', JSON.stringify(auditEntry));
    }
  }

  // ✅ إضافة: دعم التسجيل غير المتزامن لتحسين الأداء
  private async writeAuditLogAsync(auditEntry: any) {
    // استخدام قائمة انتظار داخلية لتجنب حظر الطلب الرئيسي
    process.nextTick(async () => {
      try {
        await this.writeAuditLog(auditEntry);
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
            const content = await fs.readFile(logFile, 'utf-8');
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
          } catch (error) {
            // تجاهل الملفات غير الموجودة
            if ((error as any).code !== 'ENOENT') {
              this.logger.error(`[M4] ❌ خطأ في قراءة سجلات ${logFile}: ${error.message}`);
            }
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