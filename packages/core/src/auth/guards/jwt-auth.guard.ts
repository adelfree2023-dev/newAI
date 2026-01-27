import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    // ✅ إضافة معالجة أخطاء ذكية
    async canActivate(context: any): Promise<boolean> {
        try {
            const resultOrPromise = super.canActivate(context);

            let result: boolean;
            if (resultOrPromise instanceof Promise) {
                result = await resultOrPromise;
            } else if (resultOrPromise && typeof (resultOrPromise as any).subscribe === 'function') {
                // If it's an observable, convert to promise (basic handling) or just return it if we could pipe it.
                // For simplicity and safety with async/await, we accept we might not handle Observable stream errors here perfectly
                // without rxjs imports, but standard Passport strategy usually returns Promise or Boolean.
                // Let's assume Promise for the strategy we implemented.
                return super.canActivate(context) as any;
            } else {
                result = resultOrPromise as boolean;
            }

            return result;
        } catch (error) {
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
        }
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
