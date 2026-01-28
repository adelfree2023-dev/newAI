import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    private readonly logger = new Logger(JwtStrategy.name);

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        this.logger.debug(`[M3] 🔐 Validating token for: ${payload.email}`);

        // Direct repository access to maintain SINGLETON scope
        const user = await this.userRepository.findOne({
            where: { id: payload.sub },
            select: ['id', 'email', 'role', 'tenantId', 'status']
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
