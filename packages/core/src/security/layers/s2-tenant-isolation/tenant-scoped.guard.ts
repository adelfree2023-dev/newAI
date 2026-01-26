import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';

@Injectable()
export class TenantScopedGuard implements CanActivate {
  private readonly logger = new Logger(TenantScopedGuard.name);

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const handlerName = handler.name;

    // التحقق مما إذا كانت هذه العملية معفاة من التحقق
    const isExempt = this.reflector.get<boolean>('tenant-exempt', handler) || 
                    this.reflector.get<boolean>('tenant-exempt', context.getClass());
    
    if (isExempt) {
      this.logger.debug(`[S2] ✅ العملية معفاة من فحص المستأجر: ${className}.${handlerName}`);
      return true;
    }

    // استخراج tenantId من الطلب
    const requestedTenantId = this.extractTenantIdFromRequest(request, context);
    
    if (!requestedTenantId) {
      this.logger.error(`[S2] ❌ لا يمكن تحديد المستأجر للعملية: ${className}.${handlerName}`);
      throw new ForbiddenException('لا يمكن تحديد السياق الأمني للمستأجر');
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
    
    this.logger.warn(`[S2] ⚠️ لا يمكن العثور على tenantId للطلب: ${className}.${handler.name}`);
    return this.tenantContext.getTenantId();
  }
}