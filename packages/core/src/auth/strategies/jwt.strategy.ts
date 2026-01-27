import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')
        });
    }

    async validate(payload: any) {
        const user = await this.userService.findById(payload.sub);
        if (!user || user.status !== 'ACTIVE') {
            throw new UnauthorizedException('المستخدم غير موجود أو غير نشط');
        }
        if (payload.tenantId && payload.tenantId !== user.tenantId) {
            throw new UnauthorizedException('وصول غير مصرح به للمستأجر');
        }
        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin()
        };
    }
}
