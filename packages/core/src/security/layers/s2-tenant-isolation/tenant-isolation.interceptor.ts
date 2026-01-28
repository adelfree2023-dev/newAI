import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger, Scope, ForbiddenException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TenantContextService } from './tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantIsolationInterceptor implements NestInterceptor {
    private static readonly logger = new Logger(TenantIsolationInterceptor.name);

    constructor(
        private readonly tenantContext: TenantContextService
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const className = context.getClass().name;
        const methodName = context.getHandler().name;

        try {
            const rawUrl = request.url;
            const url = rawUrl.replace(/^\/api/, '');
            TenantIsolationInterceptor.logger.debug(`[S2] 🔄 بدء اعتراض الطلب: ${className}.${methodName} (${url})`);

            // 1. التحقق من سياق المستأجر
            const tenantId = this.tenantContext.getTenantId();

            if (!tenantId && !this.tenantContext.isSystemContext()) {
                TenantIsolationInterceptor.logger.warn(`[S2] ⚠️ سياق المستأجر غير مهيأ للطلب: ${className}.${methodName}`);

                // محاولة استخراج tenantId من الطلب
                const extractedTenantId = this.extractTenantIdFromRequest(request, context);

                if (extractedTenantId) {
                    this.tenantContext.forceTenantContext(extractedTenantId);
                    TenantIsolationInterceptor.logger.log(`[S2] ✅ تم إدخال سياق المستأجر تلقائياً: ${extractedTenantId}`);
                } else if (!this.isExemptRoute(className, methodName)) {
                    return throwError(() => new ForbiddenException('سياق المستأجر مطلوب لهذا الطلب (Tenant Context Required)'));
                }
            }

            // 2. التحقق من الصلاحيات
            if (!this.tenantContext.isSystemContext()) {
                const requestedTenantId = this.tenantContext.getTenantId();
                const authenticatedUser = request.user;

                // منع استكشاف المستأجرين: إذا تم تحديد مستأجر ولكن لا يوجد مستخدم مصادق، ارمِ 403 فوراً
                if (requestedTenantId && !authenticatedUser && !this.isExemptRoute(className, methodName)) {
                    TenantIsolationInterceptor.logger.warn(`[S2] ⛔ محاولة وصول لبيانات مستأجر من مستخدم غير مصرح: ${requestedTenantId}`);
                    return throwError(() => new ForbiddenException('يجب تسجيل الدخول للوصول إلى بيانات المستأجر'));
                }

                // التحقق من صحة المستأجر في سياق المستخدم المصادق عليه
                if (authenticatedUser && authenticatedUser.tenantId && requestedTenantId) {
                    if (authenticatedUser.tenantId !== requestedTenantId && !authenticatedUser.isSuperAdmin) {
                        TenantIsolationInterceptor.logger.error(`[S2] 🚨 محاولة اختراق: مستأجر ${authenticatedUser.tenantId} يحاول الوصول إلى ${requestedTenantId}`);
                        return throwError(() => new ForbiddenException(`وصول غير مصرح به للمستأجر [Mismatch: ${authenticatedUser.tenantId} vs ${requestedTenantId}]`));
                    }
                }

                if (requestedTenantId && !this.tenantContext.validateTenantAccess(requestedTenantId)) {
                    return throwError(() => new ForbiddenException('وصول غير مصرح به للمستأجر (Tenant Access Forbidden)'));
                }
            }

            // 3. تتبع الأداء
            const startTime = Date.now();

            return next.handle().pipe(
                tap(() => {
                    const executionTime = Date.now() - startTime;
                    if (executionTime > 1000) { // أكثر من ثانية
                        TenantIsolationInterceptor.logger.warn(`[S2] ⚠️ تنفيذ بطيء: ${className}.${methodName} - الوقت: ${executionTime}ms`);
                    }
                }),
                catchError(error => {
                    // 4. التعامل مع الأخطاء
                    TenantIsolationInterceptor.logger.error(`[S2] ❌ خطأ في ${className}.${methodName}: ${error.message}`);

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
            TenantIsolationInterceptor.logger.error(`[S2] ❌ خطأ في اعتراض سياق المستأجر: ${(error as any).message}`);
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
            { class: 'AuthController', methods: ['login', 'register', 'forgotPassword', 'refresh', 'logout', 'logoutAll', 'enable2FA', 'verify2FA'] },
            { class: 'HealthController', methods: ['check', 'status', 'getHealth'] },
            { class: 'TenantController', methods: ['create', 'getAll'] },
            { class: 'TestController', methods: ['forceGenerateSPC', 'testEncryption'] }
        ];

        return exemptRoutes.some(route =>
            className.includes(route.class) &&
            route.methods.includes(methodName)
        );
    }
}
