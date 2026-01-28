import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TwoFactorService } from './services/two-factor.service';
import { SessionService } from './services/session.service';
import { BruteForceProtectionService } from './services/brute-force-protection.service';
import { UserService } from './services/user.service';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantAuthGuard } from './guards/tenant-auth.guard';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../security/layers/s7-encryption/encryption.service';
import { RateLimiterService } from '../security/layers/s6-rate-limiting/rate-limiter.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';

@Global()
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: (configService.get<string>('JWT_EXPIRES_IN', '15m') as any),
                    algorithm: 'HS256'
                }
            }),
            inject: [ConfigService]
        }),
        TypeOrmModule.forFeature([User, Session])
    ],
    providers: [
        AuthService,
        UserService,
        TwoFactorService,
        SessionService,
        BruteForceProtectionService,
        JwtStrategy,
        LocalStrategy,
        RolesGuard,
        PermissionsGuard,
        TenantAuthGuard,
        AuditService,
        EncryptionService,
        RateLimiterService
    ],
    controllers: [AuthController],
    exports: [
        AuthService,
        UserService,
        TwoFactorService,
        SessionService,
        BruteForceProtectionService,
        RolesGuard,
        PermissionsGuard,
        TenantAuthGuard,
        JwtStrategy,
        PassportModule
    ]
})
export class AuthModule implements OnModuleInit {
    private readonly logger = new Logger(AuthModule.name);

    constructor(
        private readonly jwtStrategy: JwtStrategy,
        private readonly localStrategy: LocalStrategy
    ) { }

    onModuleInit() {
        this.logger.log('🔐 [S2] تم تهيئة وحدة المصادقة واستراتيجيات Passport');

        // تسجيل الاستراتيجيات يدوياً لضمان استقرار Passport ومنع خطأ Unknown strategy
        const passport = require('passport');

        if (this.jwtStrategy) {
            passport.use('jwt', this.jwtStrategy as any);
            this.logger.log('🛡️ [S2] تم فرض تسجيل استراتيجية JWT يدوياً');
        }

        if (this.localStrategy) {
            passport.use('local', this.localStrategy as any);
            this.logger.log('🛡️ [S2] تم فرض تسجيل استراتيجية Local يدوياً');
        }

        const registeredStrategies = Object.keys(passport._strategies || {});
        this.logger.log('🌐 الاستراتيجيات النشطة حالياً: ' + registeredStrategies.join(', '));
    }
}
