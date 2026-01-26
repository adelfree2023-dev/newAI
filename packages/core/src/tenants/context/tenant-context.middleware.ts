import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(
    private readonly tenantContext: TenantContextService
  ) { }

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    try {
      // 1. استخراج tenantId من الطلب
      const tenantId = this.extractTenantId(req);

      // 2. تهيئة سياق المستأجر
      this.tenantContext.initializeTenantContext(tenantId, req);

      // 3. تسجيل بداية الطلب
      this.logRequestStart(req, tenantId, startTime);

      // 4. التحقق من العزل قبل معالجة الطلب
      this.tenantContext.validateTenantAccess(tenantId).catch(error => {
        this.logger.error(`[M2] ❌ فشل التحقق من عزل المستأجر: ${error.message}`);
        res.status(403).json({
          statusCode: 403,
          message: 'فشل التحقق من سياق الأمان',
          error: 'TENANT_ISOLATION_FAILURE'
        });
      });

      // 5. تتبُّع انتهاء الطلب
      res.on('finish', () => {
        const processingTime = Date.now() - startTime;
        this.logRequestEnd(req, res, processingTime, tenantId);
      });

      next();
    } catch (error) {
      this.logger.error(`[M2] ❌ خطأ في وسطاء سياق المستأجر: ${error.message}`);
      res.status(500).json({
        statusCode: 500,
        message: 'خطأ داخلي في خدمة المستأجر',
        error: 'TENANT_CONTEXT_ERROR'
      });
    }
  }

  private extractTenantId(req: Request): string | null {
    // البحث في الرؤوس
    if (req.headers['x-tenant-id']) {
      return req.headers['x-tenant-id'].toString();
    }

    // البحث في نطاق فرعي
    if (req.subdomains && req.subdomains[0]) {
      return req.subdomains[0];
    }

    // البحث في المسار
    const pathMatch = req.path.match(/^\/([^\/]+)\/api\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // البحث في الاستعلام
    if (req.query.tenantId) {
      return req.query.tenantId.toString();
    }

    // البحث في الجسم
    if (req.body && req.body.tenantId) {
      return req.body.tenantId;
    }

    return null;
  }

  private logRequestStart(req: Request, tenantId: string | null, startTime: number) {
    const requestId = uuidv4();
    req['requestId'] = requestId;

    this.logger.debug(`[M2] 🌐 بدء طلب جديد - المستأجر: ${tenantId || 'system'} - الطلب: ${requestId}`);

    // يمكن إضافة تسجيل مفصل هنا
  }

  private logRequestEnd(req: Request, res: Response, processingTime: number, tenantId: string | null) {
    const status = res.statusCode;
    const requestId = req['requestId'] || 'unknown';

    if (status >= 400) {
      this.logger.warn(`[M2] ⚠️ طلب فاشل - المستأجر: ${tenantId || 'system'} - الحالة: ${status} - الوقت: ${processingTime}ms`);
    } else {
      this.logger.debug(`[M2] ✅ اكتمل الطلب - المستأجر: ${tenantId || 'system'} - الحالة: ${status} - الوقت: ${processingTime}ms`);
    }
  }
}