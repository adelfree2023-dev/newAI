import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConnectionService } from './database/tenant-connection.service';
import { SchemaInitializerService } from './database/schema-initializer.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';


@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [TenantController],
  providers: [
    TenantService,
    TenantConnectionService,
    SchemaInitializerService
  ],
  exports: [
    TenantService,
    TenantConnectionService,
    SchemaInitializerService
  ],
})
export class TenantModule { }