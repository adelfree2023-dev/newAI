import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { TenantIsolationInterceptor } from './tenant-isolation.interceptor';
import { Reflector } from '@nestjs/core';

@Global()
@Module({
  providers: [
    TenantContextService,
    Reflector,
    TenantScopedGuard,
    TenantIsolationInterceptor,
    {
      provide: APP_GUARD,
      useClass: TenantScopedGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantIsolationInterceptor,
    },
  ],
  exports: [TenantContextService, TenantScopedGuard, TenantIsolationInterceptor],
})
export class TenantIsolationModule { }