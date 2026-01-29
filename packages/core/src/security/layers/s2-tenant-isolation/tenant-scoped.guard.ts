import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger, Scope } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private readonly tenantContext: TenantContextService
  ) { }

  canActivate(context: ExecutionContext): boolean {
    // ✅ استثناءات ذكية للعمليات النظامية - يجب التحقق قبل استخراج tenantId
    const className = context.getClass()?.name || 'UnknownClass';
    const methodName = context.getHandler()?.name || 'UnknownMethod';

    // ✅ العمليات المسموح لها بدون tenantId
    const systemRoutes = [
      { class: 'TenantController', methods: ['createTenant', 'getAllTenants'] },
      {
        class: 'AuthController',
        methods: ['register', 'login', 'forgotPassword', 'refresh', 'logout', 'logoutAll', 'enable2FA', 'verify2FA']
      },
      { class: 'HealthController', methods: ['check', 'status'] },
      { class: 'ProductController', methods: [] }, // سيتم التحقق من tenantId في الـ interceptor
      { class: 'TestController', methods: ['forceGenerateSPC', 'testEncryption'] },
      { class: 'OnboardingController', methods: ['quickStart', 'checkDomain'] }
    ];

    const isSystemRoute = systemRoutes.some(route =>
      className.includes(route.class) &&
      (route.methods.length === 0 || route.methods.includes(methodName))
    );

    if (isSystemRoute) {
      this.logger.debug(`[S2] ✅ System route bypassed: ${className}.${methodName}`);
      return true;
    }

    // ✅ الآن فقط نحاول استخراج tenantId
    if (!this.tenantContext) {
      this.logger.error(`[S2] 🔴 TenantContextService is undefined in Guard for: ${className}.${methodName}`);
      // في حالة وجود خلل في الحقن، نتحقق يدوياً من الرؤوس كحل احتياطي أخير
      const request = context.switchToHttp().getRequest();
      const backupTenantId = request.headers?.['x-tenant-id'];
      if (!backupTenantId && !isSystemRoute) {
        throw new ForbiddenException('فشل النظام في تأمين سياق المستأجر');
      }
      return true;
    }

    const tenantId = this.tenantContext.getTenantId();


    // ✅ التحقق من tenantId للعمليات العادية
    if (!tenantId) {
      this.logger.error(`[S2] 🔴 Missing tenantId for: ${className}.${methodName}`);
      throw new ForbiddenException('يجب تحديد معرف المستأجر');
    }

    this.logger.debug(`[S2] ✅ Tenant verified: ${tenantId}`);
    return true;
  }
}
