import { Test, TestingModule } from '@nestjs/testing';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantContextService } from './tenant-context.service';
import { createMockTenantContext } from '../../../../test/test-utils';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TenantContextInterceptor', () => {
    let interceptor: TenantContextInterceptor;
    let mockTenantContext: any;

    beforeEach(async () => {
        mockTenantContext = createMockTenantContext();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TenantContextInterceptor,
                { provide: TenantContextService, useValue: mockTenantContext }
            ],
        }).compile();

        interceptor = await module.resolve<TenantContextInterceptor>(TenantContextInterceptor);
    });

    it('should be defined', () => {
        expect(interceptor).toBeDefined();
    });

    it('should pass through the request', (done) => {
        const context = {
            switchToHttp: () => ({
                getRequest: () => ({
                    headers: {},
                    url: '/test',
                    params: {},
                    query: {},
                    body: {}
                }),
            }),
            getClass: () => ({ name: 'TestController' }),
            getHandler: () => ({ name: 'testMethod' }),
        } as unknown as ExecutionContext;
        const next: CallHandler = { handle: () => of('data') };

        interceptor.intercept(context, next).subscribe((result) => {
            expect(result).toBe('data');
            done();
        });
    });
});
