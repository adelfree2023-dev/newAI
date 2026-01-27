import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';

// ✅ استيراد PassportModule في المستوى الجذري
import { PassportModule } from '@nestjs/passport';

// Modules
import { AuthModule } from './auth/auth.module';
import { TenantModule } from './tenants/tenant.module';
import { TenantIsolationModule } from './security/layers/s2-tenant-isolation/tenant-isolation.module';
import { EnvironmentVerificationModule } from './security/layers/s1-environment-verification/environment-validator.module';
import { InputValidationModule } from './security/layers/s3-input-validation/input-validation.module';
import { AuditModule } from './security/layers/s4-audit-logging/audit.module';
import { ErrorHandlingModule } from './security/layers/s5-error-handling/error-handling.module';
import { RateLimitingModule } from './security/layers/s6-rate-limiting/rate-limit.module';
import { EncryptionModule } from './security/layers/s7-encryption/encryption.module';
import { WebProtectionModule } from './security/layers/s8-web-protection/web-protection.module';
import { ProductModule } from './products/product.module';

// Services
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';

// Entities
import { User } from './auth/entities/user.entity';
import { Session } from './auth/entities/session.entity';
import { Tenant } from './tenants/entities/tenant.entity';

@Module({
    imports: [
        // ✅ PassportModule في المستوى الجذري
        PassportModule.register({ defaultStrategy: 'jwt' }),

        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
        }),

        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL,
            entities: [User, Session, Tenant],
            synchronize: false,
            logging: process.env.NODE_ENV === 'development',
            schema: 'public',
        }),

        // Security Layers
        EnvironmentVerificationModule,
        TenantIsolationModule,
        InputValidationModule,
        AuditModule,
        ErrorHandlingModule,
        RateLimitingModule,
        EncryptionModule,
        WebProtectionModule,

        // Business Modules
        AuthModule,
        TenantModule,
        ProductModule,
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
        // ✅ تطبيق وسطاء التدقيق
        consumer.apply(AuditLoggerMiddleware).forRoutes('*');
    }
}
