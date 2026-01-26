import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Scope } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { Logger } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);

  constructor(
    private readonly tenantContext: TenantContextService
  ) { }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    try {
      // 1. التحقق من سياق المستأجر
      const tenantId = this.tenantContext.getTenantId();

      if (!tenantId && !this.tenantContext.isSystemContext()) {
        this.logger.warn(`[M2] ⚠️ سياق المستأجر غير مهيأ للطلب: ${className}.${methodName}`);

        // محاولة استخراج tenantId من الطلب
        const extractedTenantId = this.extractTenantIdFromRequest(request, context);

        if (extractedTenantId) {
          this.tenantContext.forceTenantContext(extractedTenantId);
          this.logger.log(`[M2] ✅ تم إدخال سياق المستأجر تلقائياً: ${extractedTenantId}`);
        } else if (!this.isExemptRoute(className, methodName)) {
          return throwError(() => new Error('سياق المستأجر مطلوب لهذا الطلب'));
        }
      }

      // 2. التحقق من الصلاحيات
      if (!this.tenantContext.isSystemContext()) {
        const requestedTenantId = this.extractTenantIdFromRequest(request, context);
        if (requestedTenantId && !this.tenantContext.validateTenantAccess(requestedTenantId)) {
          return throwError(() => new Error('وصول غير مصرح به للمستأجر'));
        }
      }

      // 3. تتبع الأداء
      const startTime = Date.now();

      return next.handle().pipe(
        tap(() => {
          const executionTime = Date.now() - startTime;
          if (executionTime > 1000) { // أكثر من ثانية
            this.logger.warn(`[M2] ⚠️ تنفيذ بطيء: ${className}.${methodName} - الوقت: ${executionTime}ms`);
          }
        }),
        catchError(error => {
          // 4. التعامل مع الأخطاء
          this.logger.error(`[M2] ❌ خطأ في ${className}.${methodName}: ${error.message}`);

          // تسجيل حدث أمني
          this.tenantContext.logSecurityIncident('TENANT_OPERATION_FAILURE', {
            className,
            methodName,
            error: error.message,
            stack: error.stack,
            tenantId: this.tenantContext.getTenantId() || 'unknown'
          });

          throw error;
        })
      );

    } catch (error) {
      this.logger.error(`[M2] ❌ خطأ في اعتراض سياق المستأجر: ${error.message}`);
      throw error;
    }
  }

  private extractTenantIdFromRequest(request: any, context: ExecutionContext): string | null {
    // البحث في معلمات المسار
    if (request.params && request.params.tenantId) {
      return request.params.tenantId;
    }

    if (request.params && request.params.storeId) {
      return request.params.storeId;
    }

    // البحث في الاستعلام
    if (request.query && request.query.tenantId) {
      return request.query.tenantId;
    }

    // البحث في الجسم
    if (request.body && request.body.tenantId) {
      return request.body.tenantId;
    }

    // البحث في الرؤوس
    if (request.headers['x-tenant-id']) {
      return request.headers['x-tenant-id'].toString();
    }

    // بالنسبة لبعض المحارس الخاصة
    const className = context.getClass().name;

    // السماح لبعض العمليات النظامية
    if (className.includes('AuthController') || className.includes('HealthController')) {
      return this.tenantContext.getTenantId();
    }

    return null;
  }

  private isExemptRoute(className: string, methodName: string): boolean {
    // المسارات المعفاة من التحقق من المستأجر
    const exemptRoutes = [
      { class: 'AuthController', methods: ['login', 'register', 'forgotPassword'] },
      { class: 'HealthController', methods: ['check', 'status'] },
      { class: 'TenantController', methods: ['create'] } // إنشاء مستأجر جديد لا يحتاج لسياق
    ];

    return exemptRoutes.some(route =>
      className.includes(route.class) &&
      route.methods.includes(methodName)
    );
  }
}