import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from './tenants/tenant.module';
import { TenantIsolationModule } from './security/layers/s2-tenant-isolation/tenant-isolation.module';
import { EnvironmentVerificationModule } from './security/layers/s1-environment-verification/environment-validator.module';
import { InputValidationModule } from './security/layers/s3-input-validation/input-validation.module';
import { AuditModule } from './security/layers/s4-audit-logging/audit.module';
import { ErrorHandlingModule } from './security/layers/s5-error-handling/error-handling.module';
import { RateLimitingModule } from './security/layers/s6-rate-limiting/rate-limit.module';
import { EncryptionModule } from './security/layers/s7-encryption/encryption.module';
import { WebProtectionModule } from './security/layers/s8-web-protection/web-protection.module';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';
import { TenantIsolationInterceptor } from './security/layers/s2-tenant-isolation/tenant-isolation.interceptor';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';
import { NestModule, MiddlewareConsumer } from '@nestjs/common';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env']
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [],
            synchronize: false,
            logging: process.env.NODE_ENV === 'development',
            schema: 'public' // المخطط الافتراضي
        }),
        TenantModule,
        TenantIsolationModule,
        EnvironmentVerificationModule,
        InputValidationModule,
        AuditModule,
        ErrorHandlingModule,
        RateLimitingModule,
        EncryptionModule,
        WebProtectionModule
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TenantIsolationInterceptor,
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
