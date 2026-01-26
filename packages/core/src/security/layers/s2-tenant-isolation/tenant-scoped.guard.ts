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
    const isPublic = this.reflector.get<boolean>('isPublic', handler) ||
      this.reflector.get<boolean>('isPublic', context.getClass());

    if (isPublic) {
      return true;
    }

    // 2. الحصول على معرف المستأجر من السياق الحالي (الذي تم استخراجه في Middleware)
    const tenantId = this.tenantContext.getTenantId();

    // 3. السماح لعمليات النظام (System Operations)
    if (this.tenantContext.isSystemContext()) {
      this.logger.debug(`[S2] ✅ السماح بعملية نظام: ${className}.${handler.name}`);
      return true;
    }

    // 4. التحقق الإلزامي من وجود المستأجر
    if (!tenantId) {
      this.logger.error(`[S2] 🚨 محاولة وصول مجهولة مرفوضة: ${className}.${handler.name}`);
      throw new ForbiddenException('يجب تحديد معرف المستأجر للوصول لهذه الموارد');
    }

    // 5. التحقق من سلامة العزل (Cross-tenant check)
    // نتحقق مما إذا كان المستأجر يحاول الوصول لمعرف مستأجر آخر في معلمات الطلب
    const requestedTenantIdInParams = this.extractRequestedTenantId(request);

    if (requestedTenantIdInParams && requestedTenantIdInParams !== tenantId) {
      this.logger.error(
        `[S2] 🚨 محاولة اختراق عزل المستأجرين: ${tenantId} حاول الوصول إلى ${requestedTenantIdInParams}`
      );
      throw new ForbiddenException('غير مصرح لك بالوصول لبيانات هذا المستأجر');
    }

    this.logger.debug(`[S2] ✅ تم التحقق من أمان المستأجر: ${tenantId}`);
    return true;
  }

  private extractRequestedTenantId(request: any): string | null {
    return request.params?.tenantId ||
      request.query?.tenantId ||
      request.body?.tenantId ||
      null;
  }
}
