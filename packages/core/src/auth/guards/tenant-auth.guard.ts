import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class TenantAuthGuard implements CanActivate {
    private readonly logger = new Logger(TenantAuthGuard.name);
    constructor(private readonly tenantContext: TenantContextService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) return true;
        const requestTenantId = this.tenantContext.getTenantId();
        if (!requestTenantId) return true;
        if (user.isSuperAdmin) return true;
        if (user.tenantId !== requestTenantId) {
            this.logger.error(`[M3] 🚨 محاولة وصول غير مصرح به للمستأجر: ${user.email} -> ${requestTenantId}`);
            throw new ForbiddenException('وصول غير مصرح به للهوية المذكورة');
        }
        return true;
    }
}
