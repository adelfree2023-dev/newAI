import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, Scope } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { Logger } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContextService
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const handlerName = handler.name;

    // التحقق مما إذا كانت هذه العملية معفاة من التحقق
    const isExempt = this.reflector?.get<boolean>('tenant-exempt', handler) ||
      this.reflector?.get<boolean>('tenant-exempt', context.getClass());

    if (isExempt) {
      this.logger.debug(`[S2] ✅ العملية معفاة من فحص المستأجر: ${className}.${handlerName}`);
      return true;
    }

    // استخراج tenantId من الطلب
    const requestedTenantId = this.extractTenantIdFromRequest(request, context);

    if (!requestedTenantId) {
      // السماح للعمليات النظامية (مثل إنشاء مستأجر جديد)
      if (this.isSystemRoute(className, handlerName)) {
        this.logger.debug(`[S2] ✅ عملية نظام مسموحة بدون tenantId: ${className}.${handlerName}`);
        return true;
      }

      this.logger.error(`[S2] ❌ لا يمكن تحديد المستأجر للعملية: ${className}.${handlerName}`);
      throw new ForbiddenException('X-Tenant-ID مطلوب في الرأس');
    }

    // التحقق من الصلاحية
    const hasAccess = this.tenantContext.validateTenantAccess(requestedTenantId);

    if (!hasAccess) {
      this.logger.error(
        `[S2] 🚨 رفض الوصول: ${this.tenantContext.getTenantId()} لا يستطيع الوصول إلى ${requestedTenantId} - ${className}.${handlerName}`
      );
      throw new ForbiddenException('رفض الوصول: المستأجر غير مصرح له');
    }

    this.logger.debug(`[S2] ✅ المستأجر ${requestedTenantId} مفوض للوصول إلى ${className}.${handlerName}`);
    return true;
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
    const handler = context.getHandler();
    const className = context.getClass().name;

    // السماح لبعض العمليات النظامية
    if (className.includes('AuthController') || className.includes('HealthController')) {
      return this.tenantContext.getTenantId();
    }

    return null;
  }

  private isSystemRoute(className: string, methodName: string): boolean {
    // العمليات المسموح لها بدون tenantId
    const systemRoutes = [
      { class: 'TenantController', methods: ['createTenant', 'getAllTenants', 'getHealth'] },
      { class: 'AuthController', methods: ['register', 'login', 'refresh', 'logout', 'logoutAll', 'enable2FA', 'verify2FA'] },
      { class: 'HealthController', methods: ['check', 'getHealth'] }
    ];

    return systemRoutes.some(route =>
      className.includes(route.class) &&
      route.methods.includes(methodName)
    );
  }
}
