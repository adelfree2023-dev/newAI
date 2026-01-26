import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { SchemaManagerService } from './database/schema-manager.service';
import { TenantDatabaseService } from './database/tenant-database.service';
import { IsolationValidatorService } from './database/isolation-validator.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../security/layers/s7-encryption/encryption.service';
import { VercelAgentFactory } from '../security/ai-supervisor/vercel-integration/vercel-agent-factory';

@Global()
@Module({
  providers: [
    TenantService,
    SchemaManagerService,
    {
      provide: TenantDatabaseService,
      useClass: TenantDatabaseService,
      scope: 'REQUEST'
    },
    IsolationValidatorService,
    TenantContextService,
    AuditService,
    EncryptionService,
    {
      provide: VercelAgentFactory,
      useFactory: (auditService: AuditService) => VercelAgentFactory.getInstance(auditService),
      inject: [AuditService]
    }
  ],
  exports: [
    TenantService,
    TenantDatabaseService,
    SchemaManagerService,
    IsolationValidatorService
  ],
})
export class TenantModule {}