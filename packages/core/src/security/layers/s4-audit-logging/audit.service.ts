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
        userAgent: this.request.get('User-Agent'),
        method: this.request.method,
        url: this.request.originalUrl,
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

    // إزالة البيانات الحساسة من السجلات
    const sensitiveFields = [
      'password', 'token', 'secret', 'apiKey', 'privateKey',
      'creditCard', 'cvv', 'cardNumber', 'ssn', 'socialSecurityNumber'
    ];

    if (typeof data === 'string') {
      return data.replace(/(password|token|secret|apiKey|privateKey|creditCard|cvv|cardNumber|ssn|socialSecurityNumber)[:\s]*["']?[^"'\s]+["']?/gi,
        match => {
          const field = match.split(':')[0];
          return `${field}: [REDACTED]`;
        });
    }

    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };

      for (const key of Object.keys(sanitized)) {
        const lowerKey = key.toLowerCase();

        // إخفاء الحقول الحساسة
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          sanitized[key] = '[REDACTED]';
          continue;
        }

        // معالجة كائنات داخلية
        if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
          sanitized[key] = this.sanitizeEventData(sanitized[key]);
        }
      }

      return sanitized;
    }

    return data;
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
      if (auditEntry.category === 'SECURITY' && ['TENANT_ISOLATION_VIOLATION', 'UNAUTHORIZED_ACCESS', 'DATA_BREACH_ATTEMPT'].includes(auditEntry.eventType)) {
        const criticalFile = join(this.auditDir, `${dateStr}-critical-security.log`);
        await fs.appendFile(criticalFile, logEntry);
      }
    } catch (error) {
      this.logger.error(`[S4] ❌ فشل كتابة سجل التدقيق: ${error.message}`);
      // محاولة البديل - التسجيل في وحدة التحكم
      console.error('[AUDIT_FAILURE]', JSON.stringify(auditEntry));
    }
  }

  generateAuditReport(startDate: Date, endDate: Date, category?: string): Promise<any[]> {
    // تنفيذ إنشاء التقارير هنا (سيتم تطويره لاحقاً)
    this.logger.warn('[S4] ⚠️ تقارير التدقيق تحتاج لتطوير - لم يتم تنفيذها بعد');
    return Promise.resolve([]);
  }
}