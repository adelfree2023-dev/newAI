import { Module, Global } from '@nestjs/common';
import { SecurityHeadersMiddleware } from './security-headers.middleware';
import { CSPConfigService } from './csp-config.service';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CSPConfigService,
    AuditService,
    TenantContextService
  ],
  exports: [CSPConfigService],
})
export class WebProtectionModule {}