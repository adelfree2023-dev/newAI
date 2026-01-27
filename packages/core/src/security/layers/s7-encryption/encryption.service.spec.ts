import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(async () => {
        const mockConfigService = {
            get: jest.fn().mockImplementation((key) => {
                if (key === 'ENCRYPTION_MASTER_KEY') return 'a'.repeat(64);
                return 'test';
            }),
        };
        const mockAuditService = { logSecurityEvent: jest.fn() };
        const mockTenantContext = { getTenantId: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                { provide: ConfigService, useValue: mockConfigService },
                { provide: AuditService, useValue: mockAuditService },
                { provide: TenantContextService, useValue: mockTenantContext },
            ],
        }).compile();

        service = await module.resolve<EncryptionService>(EncryptionService);
        await service.onModuleInit();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should encrypt and decrypt', async () => {
        const text = 'secret-data';
        const encrypted = await service.encryptSensitiveData(text);
        const decrypted = await service.decryptSensitiveData(encrypted);
        expect(decrypted).toBe(text);
    });
});
