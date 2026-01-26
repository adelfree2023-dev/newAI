import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;
    
    if (tenantContext && tenantContext.getTenantId) {
      return tenantContext.getTenantId();
    }
    
    return null;
  }
);

export const TenantSchema = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;
    
    if (tenantContext && tenantContext.getTenantSchema) {
      return tenantContext.getTenantSchema();
    }
    
    return null;
  }
);

export const IsSystemOperation = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext = request.tenantContext;
    
    if (tenantContext && tenantContext.isSystemContext) {
      return tenantContext.isSystemContext();
    }
    
    return false;
  }
);

export function TenantScoped() {
  return (target: any, key: string | symbol, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      const context = args.find(arg => arg && arg.switchToHttp);
      
      if (context) {
        const request = context.switchToHttp().getRequest();
        const tenantContext = request.tenantContext as TenantContextService;
        
        if (tenantContext) {
          try {
            const tenantId = tenantContext.getTenantId();
            if (!tenantId && !tenantContext.isSystemContext()) {
              throw new Error('سياق المستأجر غير مهيأ');
            }
          } catch (error) {
            console.error(`[M2] ❌ خطأ في سياق المستأجر: ${error.message}`);
            throw new Error('فشل في التحقق من سياق المستأجر');
          }
        }
      }
      
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}