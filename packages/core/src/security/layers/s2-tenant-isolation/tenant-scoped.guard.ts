import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private readonly tenantContext: TenantContextService
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = this.tenantContext.getTenantId();

    // ✅ استثناءات ذكية للعمليات النظامية
    const className = context.getClass()?.name || 'UnknownClass';
    const methodName = context.getHandler()?.name || 'UnknownMethod';

    // ✅ العمليات المسموح لها بدون tenantId
    const systemRoutes = [
      { class: 'TenantController', methods: ['create', 'getAll'] },
      { class: 'AuthController', methods: ['register', 'login'] },
      { class: 'HealthController', methods: ['check'] },
      { class: 'ProductController', methods: [] }, // سيتم التحقق من tenantId في الـ interceptor
    ];

    const isSystemRoute = systemRoutes.some(route =>
      className.includes(route.class) &&
      (route.methods.length === 0 || route.methods.includes(methodName))
    );

    if (isSystemRoute) {
      this.logger.debug(`[S2] ✅ System route bypassed: ${className}.${methodName}`);
      return true;
    }

    // ✅ التحقق من tenantId للعمليات العادية
    if (!tenantId) {
      this.logger.error(`[S2] 🔴 Missing tenantId for: ${className}.${methodName}`);
      throw new ForbiddenException('يجب تحديد معرف المستأجر');
    }

    this.logger.debug(`[S2] ✅ Tenant verified: ${tenantId}`);
    return true;
  }
}
