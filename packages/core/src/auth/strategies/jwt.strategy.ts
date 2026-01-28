import { Injectable, UnauthorizedException, Logger, OnModuleInit } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') implements OnModuleInit {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    // ✅ ضمان التحميل في دورة الحياة
    onModuleInit() {
        this.logger.log('✅ [S2] JWT Strategy initialized successfully');
    }

    async validate(payload: any) {
        this.logger.debug(`[M3] 🔐 التحقق من التوكن: ${payload.email}`);

        const user = await this.userService.findById(payload.sub);
        if (!user) {
            this.logger.warn(`[M3] ❌ المستخدم غير موجود: ${payload.sub}`);
            throw new UnauthorizedException('المستخدم غير موجود');
        }

        if (user.status !== 'ACTIVE') {
            this.logger.warn(`[M3] ⚠️ حساب غير نشط: ${user.email}`);
            throw new UnauthorizedException('المستخدم غير نشط');
        }

        // ✅ التحقق من تطابق المستأجر
        if (payload.tenantId && payload.tenantId !== user.tenantId) {
            this.logger.error(`[M3] 🔴 محاولة اختراق: ${user.email} - tenant mismatch`);
            throw new UnauthorizedException('وصول غير مصرح به للمستأجر');
        }

        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin(),
        };
    }
}
