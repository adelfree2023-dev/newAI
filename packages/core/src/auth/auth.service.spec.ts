import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from './services/user.service';
import { SessionService } from './services/session.service';
import { TwoFactorService } from './services/two-factor.service';
import { BruteForceProtectionService } from './services/brute-force-protection.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../security/layers/s7-encryption/encryption.service';
import { RateLimiterService } from '../security/layers/s6-rate-limiting/rate-limiter.service';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(async () => {
        const mockJwtService = { sign: jest.fn(), verify: jest.fn() };
        const mockConfigService = { get: jest.fn().mockReturnValue('secret') };
        const mockUserService = { findByEmail: jest.fn(), findById: jest.fn(), create: jest.fn(), save: jest.fn() };
        const mockSessionService = { create: jest.fn(), findByRefreshToken: jest.fn(), invalidateByRefreshToken: jest.fn() };
        const mockTwoFactorService = { generateVerificationToken: jest.fn(), verifyToken: jest.fn() };
        const mockBruteForceService = { recordFailedAttempt: jest.fn(), resetFailedAttempts: jest.fn() };
        const mockTenantContext = { getTenantId: jest.fn(), setTenantId: jest.fn() };
        const mockAuditService = { logSecurityEvent: jest.fn(), logSystemEvent: jest.fn() };
        const mockEncryptionService = { encryptSensitiveData: jest.fn(), decryptSensitiveData: jest.fn() };
        const mockRateLimiter = { checkRateLimit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: JwtService, useValue: mockJwtService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: UserService, useValue: mockUserService },
                { provide: SessionService, useValue: mockSessionService },
                { provide: TwoFactorService, useValue: mockTwoFactorService },
                { provide: BruteForceProtectionService, useValue: mockBruteForceService },
                { provide: TenantContextService, useValue: mockTenantContext },
                { provide: AuditService, useValue: mockAuditService },
                { provide: EncryptionService, useValue: mockEncryptionService },
                { provide: RateLimiterService, useValue: mockRateLimiter },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
