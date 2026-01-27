import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    // ✅ إضافة معالجة أخطاء ذكية
    canActivate(context: any) {
        return super.canActivate(context).catch((error) => {
            this.logger.error(`[JWT_GUARD] Error: ${error.message}`);

            // ✅ التحقق من سبب الخطأ
            if (error.message?.includes('Unknown authentication strategy')) {
                this.logger.error('🔴 CRITICAL: JWT Strategy not registered!');
                throw new UnauthorizedException('نظام المصادقة غير جاهز - يرجى المحاولة لاحقاً');
            }

            if (error.message?.includes('jwt expired')) {
                throw new UnauthorizedException('انتهت صلاحية التوكن - يرجى تسجيل الدخول مرة أخرى');
            }

            if (error.message?.includes('invalid token')) {
                throw new UnauthorizedException('توكن غير صالح');
            }

            throw new UnauthorizedException('فشل المصادقة: ' + error.message);
        });
    }

    handleRequest(err: any, user: any, info: any) {
        if (err || !user) {
            const message = info?.message || err?.message || 'فشل المصادقة';
            this.logger.warn(`[JWT_GUARD] Rejected: ${message}`);
            throw err || new UnauthorizedException(message);
        }
        return user;
    }
}
