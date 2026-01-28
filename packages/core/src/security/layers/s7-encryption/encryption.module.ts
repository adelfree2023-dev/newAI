import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { KeyRotationService } from './key-rotation.service';
import { ConfigModule } from '@nestjs/config';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    EncryptionService,
    KeyRotationService
  ],
  exports: [EncryptionService, KeyRotationService],
})
export class EncryptionModule { }