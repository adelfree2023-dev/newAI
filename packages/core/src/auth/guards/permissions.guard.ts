import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PermissionsGuard implements CanActivate {
    private readonly logger = new Logger(PermissionsGuard.name);
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const permissions = this.reflector.get<string[]>('permissions', context.getHandler());
        if (!permissions || permissions.length === 0) return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) throw new ForbiddenException('يجب تسجيل الدخول أولاً');
        if (user.isSuperAdmin) return true;

        const rolePermissions: { [key: string]: string[] } = {
            SUPER_ADMIN: ['*'],
            TENANT_ADMIN: ['manage_users', 'manage_products', 'manage_orders', 'view_analytics', 'manage_settings'],
            STORE_MANAGER: ['manage_products', 'manage_orders', 'view_analytics'],
            CUSTOMER: ['view_products', 'place_orders', 'view_own_orders']
        };
        const userPermissions = rolePermissions[user.role] || [];
        if (userPermissions.includes('*')) return true;
        const hasPermission = permissions.every(p => userPermissions.includes(p));
        if (!hasPermission) throw new ForbiddenException('ليس لديك الصلاحيات الكافية');
        return true;
    }
}
