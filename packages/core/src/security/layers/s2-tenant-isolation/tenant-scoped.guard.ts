import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;

    // 1. التحقق من الإعفاء (Exemption)
    const isPublic = this.reflector?.get<boolean>('isPublic', handler) ||
      this.reflector?.get<boolean>('isPublic', context.getClass());

    if (isPublic) {
      return true;
    }

    // 2. السماح للعمليات النظامية (System Operations)
    if (this.isSystemRoute(context)) {
      this.tenantContext.forceSystemContext();
      this.logger.debug(`[S2] ✅ السماح بعملية نظام: ${className}.${handler.name}`);
      return true;
    }

    // 3. الحصول على معرف المستأجر للعمليات العادية
    const tenantId = this.tenantContext.getTenantId();

    // 4. التحقق الإلزامي من وجود المستأجر
    if (!tenantId) {
      this.logger.error(`[S2] 🚨 محاولة وصول مجهولة مرفوضة: ${className}.${handler.name}`);
      throw new ForbiddenException('X-Tenant-ID مطلوب للوصول لهذه الموارد');
    }

    // 5. التحقق من سلامة العزل
    const requestedTenantIdInParams = this.extractRequestedTenantId(request);
    if (requestedTenantIdInParams && requestedTenantIdInParams !== tenantId) {
      this.logger.error(
        `[S2] 🚨 محاولة اختراق عزل المستأجرين: ${tenantId} حاول الوصول إلى ${requestedTenantIdInParams}`
      );
      throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذا المستأجر');
    }

    return true;
  }

  private isSystemRoute(context: ExecutionContext): boolean {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    // العمليات المسموح لها بدون tenantId
    const systemRoutes = [
      { class: 'TenantController', methods: ['createTenant', 'getAllTenants', 'getHealth'] },
      { class: 'AuthController', methods: ['register', 'login'] },
      { class: 'HealthController', methods: ['check', 'getHealth'] }
    ];

    return systemRoutes.some(route =>
      className.includes(route.class) &&
      route.methods.includes(methodName)
    );
  }

  private extractRequestedTenantId(request: any): string | null {
    return request.params?.tenantId ||
      request.query?.tenantId ||
      request.body?.tenantId ||
      null;
  }
}
