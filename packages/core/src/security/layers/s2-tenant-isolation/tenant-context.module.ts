import { Module, Global } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextService } from './tenant-context.service';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { Reflector } from '@nestjs/core';

@Global()
@Module({
  providers: [
    TenantContextService,
    Reflector,
    TenantScopedGuard,
    TenantContextInterceptor,
    {
      provide: APP_GUARD,
      useClass: TenantScopedGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  exports: [TenantContextService],
})
export class TenantContextModule { }