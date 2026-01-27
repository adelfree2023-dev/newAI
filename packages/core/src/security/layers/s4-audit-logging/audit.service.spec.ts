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

    it('should log an event', async () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation();
        await service.log({ userId: 'u1', action: 'TEST', resource: 'RES', tenantId: 't1' });
        expect(logSpy).toHaveBeenCalled();
        logSpy.mockRestore();
    });
});
