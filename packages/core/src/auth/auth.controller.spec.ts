import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SecurityContext } from '../security.context';
import { InputValidatorService } from '../security/layers/s3-input-validation/input-validator.service';
import { RateLimiterService } from '../security/layers/s6-rate-limiting/rate-limiter.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { HttpStatus, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const mockAuthService = {
    login: jest.fn().mockResolvedValue({ accessToken: 'tok', refreshToken: 'ref' }),
    register: jest.fn().mockResolvedValue({ success: true }),
    verify2FA: jest.fn(),
    enable2FA: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    changePassword: jest.fn(),
  };
  const mockTenantContext = { setTenantId: jest.fn(), clearTenantId: jest.fn(), getTenantId: jest.fn() };
  const mockSecurity = { logSecurityEvent: jest.fn() };
  const mockValidator = { secureValidate: jest.fn().mockImplementation(async (_, data) => data) };
  const mockRateLimiter = { consume: jest.fn().mockResolvedValue({ allowed: true }) };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: TenantContextService, useValue: mockTenantContext },
        { provide: InputValidatorService, useValue: mockValidator },
        { provide: RateLimiterService, useValue: mockRateLimiter },
        { provide: SecurityContext, useValue: mockSecurity },
      ],
    })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenantId = 'tenant-uuid';
  const ip = '1.2.3.4';

  describe('POST /login', () => {
    const validLogin: LoginDto = {
      email: 'user@example.com',
      password: 'ValidPass123!',
    };

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .set('x-tenant-id', tenantId)
        .set('X-Forwarded-For', ip)
        .send(validLogin)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual({ accessToken: 'tok', refreshToken: 'ref' });
    });
  });

  describe('POST /register', () => {
    const validRegister: RegisterDto = {
      email: 'newuser@example.com',
      password: 'SuperStrongPass123!',
      name: 'New User',
    };

    it('should register successfully with valid data', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .set('x-tenant-id', tenantId)
        .set('X-Forwarded-For', ip)
        .send(validRegister)
        .expect(HttpStatus.CREATED);
    });
  });
});
