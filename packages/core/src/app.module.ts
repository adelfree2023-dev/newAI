import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
// Force Revert: Removing PassportModule to fix undefined guard regression
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantModule } from './tenants/tenant.module';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entities/user.entity';
import { Session } from './auth/entities/session.entity';
import { Tenant } from './tenants/entities/tenant.entity';
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

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env']
        }),
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [User, Session, Tenant],
            synchronize: true,
            logging: process.env.NODE_ENV === 'development',
            schema: 'public' // المخطط الافتراضي
        }),
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
        WebProtectionModule
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
