import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AISupervisorModule } from './security/ai-supervisor/ai-supervisor.module';
import { TenantModule } from './tenants/tenant.module';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';
import { TenantContextMiddleware } from './tenants/context/tenant-context.middleware';

import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.production', '.env.example'],
        }),
        AISupervisorModule,
        TenantModule,
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
            .forRoutes('*')
            .apply(TenantContextMiddleware)
            .forRoutes('*');
    }
}
