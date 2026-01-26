import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { APP_GUARD } from '@nestjs/core';

@Global()
@Module({
  providers: [
    TenantContextService,
    TenantScopedGuard,
    {
      provide: APP_GUARD,
      useClass: TenantScopedGuard,
    },
  ],
  exports: [TenantContextService, TenantScopedGuard],
})
export class TenantIsolationModule { }