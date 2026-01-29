import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextModule } from './tenant-context.module';
import { TenantContextService } from './tenant-context.service';
import { REQUEST } from '@nestjs/core';

describe('TenantContextModule', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [TenantContextModule],
      providers: [
        {
          provide: REQUEST,
          useValue: {
            headers: {},
            path: '/test'
          }
        }
      ]
    }).compile();
  });

  it('exports TenantContextService', async () => {
    const svc = await module.resolve<TenantContextService>(TenantContextService);
    expect(svc).toBeInstanceOf(TenantContextService);
  });
});
