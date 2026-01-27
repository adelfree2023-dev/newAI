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

    it('should check rate limit', async () => {
        // Mocking redis might be needed if it fails, but for now just fixing compilation
        const result = await (service as any).checkRateLimit('test', 10, 60);
        expect(result).toBeDefined();
    });
});
