import { Module, Global } from '@nestjs/common';
import { SecurityMonitoringService } from './security-monitoring.service';
import { AnomalyAnalyzerService } from './anomaly-analyzer.service';
import { AutomatedResponseService } from '../response/automated-response.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { AuditArchiverService } from '../layers/s4-audit-logging/audit-archiver.service';
import { BruteForceProtectionService } from '../../auth/services/brute-force-protection.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        SecurityMonitoringService,
        AnomalyAnalyzerService,
        AutomatedResponseService,
        AuditService,
        AuditArchiverService,
        BruteForceProtectionService,
        EncryptionService
    ],
    exports: [
        SecurityMonitoringService,
        AnomalyAnalyzerService,
        AutomatedResponseService,
        AuditArchiverService
    ]
})
export class SecurityMonitoringModule { }
