import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';

describe('AuditService', () => {
    let service: AuditService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuditService],
        }).compile();

        service = module.get<AuditService>(AuditService);
    });

    it('should log a security event', async () => {
        await service.logSecurityEvent('TEST_EVENT', { data: 'test' });
        expect(service).toBeDefined();
    });
});
