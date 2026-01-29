import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);
    constructor(private readonly reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<UserRole[]>('roles', context.getHandler());
        if (!requiredRoles || requiredRoles.length === 0) return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user) throw new ForbiddenException('يجب تسجيل الدخول أولاً');

        const hasRole = requiredRoles.some(role => user.role === role || (role === 'SUPER_ADMIN' && user.isSuperAdmin));
        if (!hasRole) {
            this.logger.warn(`[M3] 🚨 محاولة وصول غير مصرح به: ${user.email} - الدور: ${user.role}`);
            throw new ForbiddenException('وصول غير مصرح به');
        }
        return true;
    }
}
