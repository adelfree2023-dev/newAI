import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { AnomalyDetectionService } from './anomaly-detection.service';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    RateLimiterService,
    AnomalyDetectionService
  ],
  exports: [RateLimiterService, AnomalyDetectionService],
})
export class RateLimitingModule { }