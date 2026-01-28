import { Module, Global } from '@nestjs/common';
import { InputValidatorService } from './input-validator.service';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Global()
@Module({
  providers: [InputValidatorService, AuditService],
  exports: [InputValidatorService],
})
export class InputValidationModule { }