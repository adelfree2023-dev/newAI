import { Module, Global } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './exceptions/secure-exception.filter';
import { DatabaseExceptionFilter } from './exceptions/database-exception.filter';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Global()
@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: DatabaseExceptionFilter,
    },
  ],
})
export class ErrorHandlingModule { }