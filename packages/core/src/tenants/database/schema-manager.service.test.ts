import { SchemaManagerService } from './schema-manager.service';
import { ConfigService } from '@nestjs/config';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../../security/layers/s7-encryption/encryption.service';
import { VercelAgentFactory } from '../../security/ai-supervisor/vercel-integration/vercel-agent-factory';

describe('SchemaManagerService', () => {
    let service: SchemaManagerService;
    let mockConfig: jest.Mocked<ConfigService>;
    let mockTenantContext: jest.Mocked<TenantContextService>;
    let mockAudit: jest.Mocked<AuditService>;
    let mockEncryption: jest.Mocked<EncryptionService>;
    let mockVercelAgents: jest.Mocked<VercelAgentFactory>;

    beforeEach(() => {
        mockConfig = {
            get: jest.fn().mockReturnValue('postgresql://postgres:postgres@localhost:5432/test_db'),
        } as any;
        mockTenantContext = {} as any;
        mockAudit = {
            logSystemEvent: jest.fn(),
            logSecurityEvent: jest.fn(),
            logBusinessEvent: jest.fn(),
        } as any;
        mockEncryption = {} as any;
        mockVercelAgents = {
            validateDatabaseIsolation: jest.fn().mockResolvedValue({ isolationStatus: 'SECURE' }),
        } as any;

        service = new SchemaManagerService(
            mockConfig,
            mockTenantContext,
            mockAudit,
            mockEncryption,
            mockVercelAgents
        );
    });

    it('should generate secure schema names', () => {
        // @ts-ignore - accessing private method for test
        const schemaName = service.generateSchemaName('Tenant-123! @');
        expect(schemaName).toBe('tenant_tenant-123___');
    });

    it('should validate isolation using AI', async () => {
        // @ts-ignore - initialization logic
        service.dataSource = { initialize: jest.fn() } as any;
        // @ts-ignore
        await service.validateIsolationIntegrity();

        expect(mockVercelAgents.validateDatabaseIsolation).toHaveBeenCalledWith(
            expect.objectContaining({
                protocolVersion: 'ASMP/v2.4',
                layer: 'S2'
            })
        );
    });
});
