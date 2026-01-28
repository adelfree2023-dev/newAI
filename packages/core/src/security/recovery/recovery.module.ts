import { Module, Global } from '@nestjs/common';
import { DataSnapshotService } from './data-snapshot.service';
import { RollbackService } from './rollback.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        DataSnapshotService,
        RollbackService,
        AuditService,
        TenantContextService,
        EncryptionService
    ],
    exports: [DataSnapshotService, RollbackService]
})
export class RecoveryModule { }
