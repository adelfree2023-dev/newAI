import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';

import { ConfigService } from '@nestjs/config';
import { SecurityContext } from '../security/security.context';
import { AnomalyDetectionService } from '../security/layers/s6-rate-limiting/anomaly-detection.service';
import { RateLimiterService } from '../security/layers/s6-rate-limiting/rate-limiter.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { InputValidatorService } from '../security/layers/s3-input-validation/input-validator.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService).useValue({ $connect: jest.fn(), $disconnect: jest.fn(), $queryRawUnsafe: jest.fn().mockResolvedValue([]), $executeRawUnsafe: jest.fn().mockResolvedValue(1) })
      .overrideProvider(ConfigService).useValue({ get: jest.fn().mockReturnValue('mock-secret') })
      .overrideProvider(SecurityContext).useValue({ logSecurityEvent: jest.fn() })
      .overrideProvider(AnomalyDetectionService).useValue({ detect: jest.fn() })
      .overrideProvider(RateLimiterService).useValue({ consume: jest.fn() })
      .overrideProvider(AuditService).useValue({ logActivity: jest.fn(), logSecurityEvent: jest.fn() })
      .overrideProvider(InputValidatorService).useValue({ secureValidate: jest.fn() })
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('should export AuthService', () => {
    const exported = module.get<AuthService>(AuthService);
    expect(exported).toBeInstanceOf(AuthService);
  });

  it('should contain AuthController', () => {
    const controller = module.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should be able to resolve all required providers', async () => {
    expect(module.get(PrismaService)).toBeDefined();
    // Resolve scoped provider
    const tenantContext = await module.resolve(TenantContextService);
    expect(tenantContext).toBeDefined();
  });
});
