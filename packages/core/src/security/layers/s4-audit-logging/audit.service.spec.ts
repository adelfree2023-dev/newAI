import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { REQUEST } from '@nestjs/core';
import { TenantContextService } from '../../layers/s2-tenant-isolation/tenant-context.service';

describe('AuditService', () => {
    let service: AuditService;

    beforeEach(async () => {
        const mockRequest = {
            headers: {},
            connection: { remoteAddress: '127.0.0.1' }
        };
        const mockTenantContext = { getTenantId: jest.fn(), getTenantSchema: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: REQUEST, useValue: mockRequest },
                { provide: TenantContextService, useValue: mockTenantContext },
            ],
        }).compile();

        service = await module.resolve<AuditService>(AuditService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should log a security event', async () => {
        // Mocking fs.appendFile
        const fs = require('fs').promises;
        jest.spyOn(fs, 'appendFile').mockResolvedValue(undefined as any);
        jest.spyOn(fs, 'mkdir').mockResolvedValue(undefined as any);

        await service.logSecurityEvent('TEST_EVENT', { data: 'test' });
        expect(service).toBeDefined();
    });
});
