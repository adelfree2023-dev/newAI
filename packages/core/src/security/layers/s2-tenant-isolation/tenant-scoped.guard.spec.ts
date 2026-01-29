import { Test, TestingModule } from '@nestjs/testing';
import { TenantScopedGuard } from './tenant-scoped.guard';
import { TenantContextService } from './tenant-context.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { createMockTenantContext } from '../../../../test/test-utils';

describe('TenantScopedGuard', () => {
  let guard: TenantScopedGuard;
  let mockTenantContext: any;

  beforeEach(async () => {
    mockTenantContext = createMockTenantContext();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantScopedGuard,
        { provide: TenantContextService, useValue: mockTenantContext },
      ],
    }).compile();

    guard = await module.resolve<TenantScopedGuard>(TenantScopedGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (handlerName = 'testMethod', className = 'TestController', headers: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
      getHandler: () => ({ name: handlerName }),
      getClass: () => ({ name: className }),
    } as any;
  };

  it('should allow access if tenant ID is present in context', async () => {
    mockTenantContext.getTenantId.mockReturnValue('t1');
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if tenant ID is missing', async () => {
    mockTenantContext.getTenantId.mockReturnValue(null);
    const context = createMockContext();
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow system routes without tenant context', async () => {
    mockTenantContext.getTenantId.mockReturnValue(null);
    const context = createMockContext('login', 'AuthController');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow health check routes', async () => {
    mockTenantContext.getTenantId.mockReturnValue(null);
    const context = createMockContext('check', 'HealthController');
    expect(guard.canActivate(context)).toBe(true);
  });
});
