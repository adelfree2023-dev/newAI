import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterService', () => {
    let service: RateLimiterService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RateLimiterService],
        }).compile();

        service = module.get<RateLimiterService>(RateLimiterService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should allow requests within limit', async () => {
        const result = await service.isAllowed('key', 10, 60);
        expect(result).toBe(true);
    });
});
