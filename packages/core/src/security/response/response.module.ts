import { Module, Global } from '@nestjs/common';
import { AlertNotifierService } from './alert-notifier.service';
import { AutomatedResponseService } from './automated-response.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { BruteForceProtectionService } from '../../auth/services/brute-force-protection.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        AlertNotifierService,
        AutomatedResponseService,
        BruteForceProtectionService
    ],
    exports: [AlertNotifierService, AutomatedResponseService]
})
export class ResponseModule { }
