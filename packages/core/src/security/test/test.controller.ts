import { Controller, Post, Body, Headers, Logger, Get } from '@nestjs/common';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { AISecuritySupervisorService } from '../ai-supervisor/ai-security-supervisor.service';

@Controller('api/test')
export class TestController {
    private readonly logger = new Logger(TestController.name);

    constructor(
        private readonly encryptionService: EncryptionService,
        private readonly auditService: AuditService,
        private readonly aiSupervisor: AISecuritySupervisorService
    ) { }

    @Get('generate-spc')
    async forceGenerateSPC() {
        this.logger.log('🧪 [TEST] طلب توليد ملف بروتوكول الأمان (SPC) يدوياً');
        const spcData = await this.aiSupervisor.generateSecurityProtocolFile();
        return {
            success: true,
            message: 'تم توليد ملف SPC بنجاح',
            data: spcData
        };
    }

    @Post('encryption')
    async testEncryption(
        @Headers('X-Tenant-ID') tenantId: string,
        @Body() body: { data: string, context: string }
    ) {
        this.logger.log(`🧪 [TEST] فحص التشفير للمستأجر: ${tenantId}`);

        // محاكاة التشفير
        const encrypted = await this.encryptionService.encryptSensitiveData(body.data, body.context || 'test');

        // تسجيل حدث التشفير في التدقيق
        await this.auditService.logSecurityEvent('DATA_ENCRYPTION', {
            tenantId,
            context: body.context,
            timestamp: new Date().toISOString()
        });

        // محاكاة فك التشفير
        const decrypted = await this.encryptionService.decryptSensitiveData(encrypted, body.context || 'test');

        // تسجيل حدث فك التشفير
        await this.auditService.logSecurityEvent('DATA_DECRYPTION', {
            tenantId,
            context: body.context,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            data: decrypted,
            context: body.context,
            securityStatus: 'VERIFIED'
        };
    }
}
