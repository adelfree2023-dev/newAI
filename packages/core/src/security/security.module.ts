import { Module, Global } from '@nestjs/common';
import { SecurityMonitoringModule } from './monitoring/security-monitoring.module';
import { ResponseModule } from './response/response.module';
import { RecoveryModule } from './recovery/recovery.module';
import { TenantContextModule } from './layers/s2-tenant-isolation/tenant-context.module';
import { EnvironmentVerificationModule } from './layers/s1-environment-verification/environment-validator.module';
import { InputValidationModule } from './layers/s3-input-validation/input-validation.module';
import { AuditModule } from './layers/s4-audit-logging/audit.module';
import { ErrorHandlingModule } from './layers/s5-error-handling/error-handling.module';
import { RateLimitingModule } from './layers/s6-rate-limiting/rate-limit.module';
import { EncryptionModule } from './layers/s7-encryption/encryption.module';
import { WebProtectionModule } from './layers/s8-web-protection/web-protection.module';

@Global()
@Module({
    imports: [
        SecurityMonitoringModule,
        ResponseModule,
        RecoveryModule,
        TenantContextModule,
        EnvironmentVerificationModule,
        InputValidationModule,
        AuditModule,
        ErrorHandlingModule,
        RateLimitingModule,
        EncryptionModule,
        WebProtectionModule
    ],
    exports: [
        SecurityMonitoringModule,
        ResponseModule,
        RecoveryModule,
        TenantContextModule,
        EnvironmentVerificationModule,
        InputValidationModule,
        AuditModule,
        ErrorHandlingModule,
        RateLimitingModule,
        EncryptionModule,
        WebProtectionModule
    ]
})
export class SecurityModule { }
