import { Module, Global } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantConnectionService } from './database/tenant-connection.service';
import { SchemaInitializerService } from './database/schema-initializer.service';

@Global()
@Module({
  imports: [],
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