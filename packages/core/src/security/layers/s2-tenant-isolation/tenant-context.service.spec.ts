import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextService } from './tenant-context.service';
import { REQUEST } from '@nestjs/core';

describe('TenantContextService', () => {
  let service: TenantContextService;
  let mockRequest: any;

  beforeEach(async () => {
    mockRequest = {
      headers: {},
      path: '/',
      hostname: 'localhost'
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantContextService,
        { provide: REQUEST, useValue: mockRequest }
      ],
    }).compile();

    service = await module.resolve<TenantContextService>(TenantContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract tenant ID from headers', async () => {
    mockRequest.headers['x-tenant-id'] = 't1';
    // Re-create service to trigger constructor logic
    const module = await Test.createTestingModule({
      providers: [
        TenantContextService,
        { provide: REQUEST, useValue: mockRequest }
      ],
    }).compile();
    service = await module.resolve<TenantContextService>(TenantContextService);

    expect(service.getTenantId()).toBe('t1');
    expect(service.getTenantSchema()).toBe('tenant_t1');
  });

  it('should extract tenant ID from subdomains', async () => {
    mockRequest.subdomains = ['store1'];
    mockRequest.hostname = 'store1.apex-platform.com';

    const module = await Test.createTestingModule({
      providers: [
        TenantContextService,
        { provide: REQUEST, useValue: mockRequest }
      ],
    }).compile();
    service = await module.resolve<TenantContextService>(TenantContextService);

    expect(service.getTenantId()).toBe('store1');
  });

  it('should return null if no tenant context found', () => {
    expect(service.getTenantId()).toBeNull();
  });

  it('should handle system context correctly', () => {
    expect(service.isSystemContext()).toBe(true);
  });

  it('should validate tenant access', () => {
    service.forceTenantContext('t1');
    expect(service.validateTenantAccess('t1')).toBe(true);
    expect(service.validateTenantAccess('t2')).toBe(false);
  });

  it('should allow system context to access any tenant', async () => {
    // Default is system context when no tenant found
    expect(service.isSystemContext()).toBe(true);
    expect(service.validateTenantAccess('any-tenant')).toBe(true);
  });
});
