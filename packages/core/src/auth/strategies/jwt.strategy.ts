import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        this.logger.debug(`[M3] 🔐 Validating token for: ${payload.email}`);

        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                role: true,
                tenantId: true,
                status: true
            }
        });

        if (!user) {
            this.logger.warn(`[M3] ❌ User not found: ${payload.sub}`);
            throw new UnauthorizedException('المستخدم غير موجود');
        }

        if (user.status !== 'ACTIVE') {
            this.logger.warn(`[M3] ⚠️ Inactive user: ${user.email}`);
            throw new UnauthorizedException('المستخدم غير نشط');
        }

        return {
            userId: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
        };
    }
}
