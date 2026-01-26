import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConnectionService } from './database/tenant-connection.service';
import { SchemaInitializerService } from './database/schema-initializer.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { TypeOrmModule } from '@nestjs/typeorm';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantConnectionService,
    SchemaInitializerService,
    TenantContextService,
    AuditService
  ],
  exports: [
    TenantService,
    TenantConnectionService,
    SchemaInitializerService,
    TenantContextService
  ],
})
export class TenantModule { }