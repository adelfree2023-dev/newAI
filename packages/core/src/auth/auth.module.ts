import { Module, Global, OnModuleInit, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { TwoFactorService } from './services/two-factor.service';
import { SessionService } from './services/session.service';
import { BruteForceProtectionService } from './services/brute-force-protection.service';
import { UserService } from './services/user.service';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantAuthGuard } from './guards/tenant-auth.guard';

@Global()
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt', property: 'user', session: false }),
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
        TenantAuthGuard
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

    onModuleInit() {
        this.logger.log('🔐 [S2] Authentication Module initialized');
    }
}
