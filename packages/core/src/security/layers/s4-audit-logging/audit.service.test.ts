import { AuditService } from './audit.service';
import { TenantContextService } from '../../layers/s2-tenant-isolation/tenant-context.service';
import { Request } from 'express';
import { promises as fs } from 'fs';

jest.mock('fs', () => ({
    promises: {
        mkdir: jest.fn().mockResolvedValue(undefined),
        appendFile: jest.fn().mockResolvedValue(undefined),
    },
}));

describe('AuditService', () => {
    let service: AuditService;
    let mockRequest: any;
    let mockTenantContext: jest.Mocked<TenantContextService>;

    beforeEach(() => {
        mockRequest = {
            method: 'POST',
            originalUrl: '/api/test',
            get: jest.fn().mockReturnValue('TestAgent'),
            headers: {},
            connection: { remoteAddress: '127.0.0.1' },
        };

        mockTenantContext = {
            getTenantId: jest.fn().mockReturnValue('tenant-123'),
            getTenantSchema: jest.fn().mockReturnValue('tenant_tenant_123'),
        } as any;

        service = new AuditService(mockRequest as any, mockTenantContext);
    });

    it('should log security event and redact sensitive data', async () => {
        const eventData = {
            userId: 'user-1',
            password: 'secret-password-123',
            apiKey: 'key-456'
        };

        service.logSecurityEvent('USER_LOGIN', eventData);

        const appendFileMock = fs.appendFile as jest.Mock;
        expect(appendFileMock).toHaveBeenCalled();

        const writtenData = JSON.parse(appendFileMock.mock.calls[0][1]);
        expect(writtenData.eventData.password).toBe('[REDACTED]');
        expect(writtenData.eventData.apiKey).toBe('[REDACTED]');
        expect(writtenData.category).toBe('SECURITY');
        expect(writtenData.context.tenantId).toBe('tenant-123');
    });

    it('should log business and system events', async () => {
        service.logBusinessEvent('PURCHASE', { amount: 100 });
        service.logSystemEvent('DATABASE_INIT', { status: 'OK' });

        expect(fs.appendFile).toHaveBeenCalledTimes(2);
    });
});
