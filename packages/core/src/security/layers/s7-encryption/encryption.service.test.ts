import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

describe('EncryptionService', () => {
    let service: EncryptionService;
    let mockConfig: jest.Mocked<ConfigService>;
    let mockAudit: jest.Mocked<AuditService>;
    let mockTenantContext: jest.Mocked<TenantContextService>;

    beforeEach(async () => {
        mockConfig = {
            get: jest.fn().mockReturnValue('a'.repeat(64)), // 64 chars master key
        } as any;

        mockAudit = {
            logSecurityEvent: jest.fn(),
        } as any;

        mockTenantContext = {
            getTenantId: jest.fn().mockReturnValue('test-tenant'),
        } as any;

        service = new EncryptionService(mockConfig, mockAudit, mockTenantContext);
        await service.onModuleInit();
    });

    it('should encrypt and decrypt data correctly', async () => {
        const originalData = 'Sensitive Info 123';
        const encrypted = await service.encryptSensitiveData(originalData, 'test-context');

        expect(encrypted).toContain('encryptedData');
        expect(encrypted).toContain('iv');
        expect(encrypted).toContain('authTag');

        const decrypted = await service.decryptSensitiveData(encrypted, 'test-context');
        expect(decrypted).toBe(originalData);
    });

    it('should fail decryption with wrong context', async () => {
        const originalData = 'Sensitive Info';
        const encrypted = await service.encryptSensitiveData(originalData, 'correct-context');

        await expect(service.decryptSensitiveData(encrypted, 'wrong-context'))
            .rejects.toThrow('فشل في فك تشفير البيانات الحساسة');
    });

    it('should hash and verify data correctly', async () => {
        const data = 'Password123';
        const hash = await service.hashData(data);

        expect(hash).toContain(':');

        const isValid = await service.verifyHash(data, hash);
        expect(isValid).toBe(true);

        const isInvalid = await service.verifyHash('WrongPassword', hash);
        expect(isInvalid).toBe(false);
    });
});
