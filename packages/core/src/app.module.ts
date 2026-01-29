import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TenantModule } from './tenants/tenant.module';
import { AuthModule } from './auth/auth.module';
import { TenantIsolationModule } from './security/layers/s2-tenant-isolation/tenant-isolation.module';
import { EnvironmentVerificationModule } from './security/layers/s1-environment-verification/environment-validator.module';
import { InputValidationModule } from './security/layers/s3-input-validation/input-validation.module';
import { AuditModule } from './security/layers/s4-audit-logging/audit.module';
import { ErrorHandlingModule } from './security/layers/s5-error-handling/error-handling.module';
import { RateLimitingModule } from './security/layers/s6-rate-limiting/rate-limit.module';
import { EncryptionModule } from './security/layers/s7-encryption/encryption.module';
import { WebProtectionModule } from './security/layers/s8-web-protection/web-protection.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';
import { ProductModule } from './products/product.module';
import { SecurityMonitoringModule } from './security/monitoring/security-monitoring.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env']
        }),
        PrismaModule,
        TenantModule,
        AuthModule,
        ProductModule,
        TenantIsolationModule,
        EnvironmentVerificationModule,
        InputValidationModule,
        AuditModule,
        ErrorHandlingModule,
        RateLimitingModule,
        EncryptionModule,
        WebProtectionModule,
        SecurityMonitoringModule,
        OnboardingModule
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(AuditLoggerMiddleware)
            .forRoutes('*');
    }
}
