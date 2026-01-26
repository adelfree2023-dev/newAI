import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CSPConfigService } from './csp-config.service';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityHeadersMiddleware.name);

  constructor(
    private readonly cspConfig: CSPConfigService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = req['requestId'] || uuidv4();
      const tenantId = this.tenantContext.getTenantId() || 'system';
      
      this.logger.debug(`[S8] إضافة رؤوس الأمان للطلب: ${requestId}`);
      
      // 1. محتوى سياسة الأمان (Content Security Policy)
      const cspHeader = this.cspConfig.generateCSPHeader(tenantId, req.hostname);
      if (cspHeader) {
        res.setHeader('Content-Security-Policy', cspHeader);
      }
      
      // 2. X-Content-Type-Options
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // 3. X-Frame-Options
      res.setHeader('X-Frame-Options', 'DENY');
      
      // 4. X-XSS-Protection
      res.setHeader('X-XSS-Protection', '1; mode=block');
      
      // 5. Strict-Transport-Security (HSTS)
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      }
      
      // 6. Referrer-Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      // 7. Permissions-Policy (سابقاً Feature-Policy)
      res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
      
      // 8. Cross-Origin-Opener-Policy
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      
      // 9. Cross-Origin-Embedder-Policy
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      
      // 10. Cross-Origin-Resource-Policy
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
      
      // تسجيل إضافة رؤوس الأمان
      this.auditService.logSystemEvent('SECURITY_HEADERS_APPLIED', {
        requestId,
        tenantId,
        headers: {
          csp: !!cspHeader,
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
          hsts: process.env.NODE_ENV === 'production'
        },
        timestamp: new Date().toISOString()
      });
      
      next();
    } catch (error) {
      this.logger.error(`[S8] ❌ خطأ في إضافة رؤوس الأمان: ${error.message}`);
      
      // في حالة الخطأ، نستمر في الطلب مع تسجيل الحدث
      this.auditService.logSecurityEvent('SECURITY_HEADERS_FAILURE', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      next();
    }
  }
}

export function securityHeaders() {
  return new SecurityHeadersMiddleware();
}