import { Injectable, NestMiddleware, Logger, Scope } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class AuditLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditLoggerMiddleware.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) { }

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = uuidv4();
    const startTime = Date.now();

    // تخزين requestId في الطلب
    req['requestId'] = requestId;

    // تسجيل بداية الطلب
    this.logRequestStart(req, requestId);

    // تتبُّع انتهاء الطلب
    res.on('finish', () => {
      const processingTime = Date.now() - startTime;
      this.logRequestEnd(req, res, processingTime, requestId);
    });

    next();
  }

  private logRequestStart(req: Request, requestId: string) {
    const tenantId = this.tenantContext.getTenantId() || 'system';
    const userId = (req as any).user?.id || 'anonymous';

    this.auditService.logSystemEvent('REQUEST_STARTED', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: this.getClientIp(req),
      userAgent: req.get('User-Agent'),
      tenantId,
      userId,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeRequestBody(req.body),
      timestamp: new Date().toISOString()
    });
  }

  private logRequestEnd(req: Request, res: Response, processingTime: number, requestId: string) {
    const status = res.statusCode;
    const tenantId = this.tenantContext.getTenantId() || 'system';

    // تسجيل حدث بناءً على حالة الاستجابة
    if (status >= 400 && status < 500) {
      this.auditService.logSecurityEvent('CLIENT_ERROR', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: status,
        processingTime,
        tenantId,
        ip: this.getClientIp(req),
        details: {
          errorType: 'CLIENT_ERROR',
          message: `طلب خاطئ من العميل - ${status}`
        }
      });
    } else if (status >= 500) {
      this.auditService.logSecurityEvent('SERVER_ERROR', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: status,
        processingTime,
        tenantId,
        details: {
          errorType: 'SERVER_ERROR',
          message: `خطأ في الخادم - ${status}`
        }
      });
    } else {
      this.auditService.logBusinessEvent('REQUEST_COMPLETED', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: status,
        processingTime,
        tenantId,
        ip: this.getClientIp(req),
        success: true
      });
    }

    // تسجيل محاولات الوصول غير المصرح بها
    if (status === 401 || status === 403) {
      this.auditService.logSecurityEvent('UNAUTHORIZED_ACCESS_ATTEMPT', {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: status,
        tenantId,
        ip: this.getClientIp(req),
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      });
    }
  }

  private getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    }
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  private sanitizeHeaders(headers: Record<string, any>): Record<string, string> {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.some(sh => lowerKey.includes(sh))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = typeof value === 'string' ? value.substring(0, 100) : JSON.stringify(value).substring(0, 100);
      }
    }

    return sanitized;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'privateKey', 'creditCard', 'cvv'];
    const sanitized = { ...body };

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeRequestBody(sanitized[key]);
      } else if (typeof sanitized[key] === 'string' && sanitized[key].length > 500) {
        sanitized[key] = sanitized[key].substring(0, 500) + '... [TRUNCATED]';
      }
    }

    return sanitized;
  }
}