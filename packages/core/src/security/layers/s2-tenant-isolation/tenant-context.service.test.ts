import { TenantContextService } from './tenant-context.service';
import { Request } from 'express';

describe('TenantContextService', () => {
    let service: TenantContextService;
    let mockRequest: any;

    beforeEach(() => {
        mockRequest = {
            headers: {
                'x-tenant-id': 'client-a'
            },
            subdomains: [],
            hostname: 'api.example.com',
            path: '/api/v1/resource',
            get: jest.fn(),
            ip: '127.0.0.1'
        };
    });

    it('should initialize tenant context from headers', () => {
        service = new TenantContextService(mockRequest as any);
        expect(service.getTenantId()).toBe('client-a');
        expect(service.getTenantSchema()).toBe('tenant_client_a');
        expect(service.isSystemContext()).toBe(false);
    });

    it('should handle system context when no tenant id is provided', () => {
        mockRequest.headers = {};
        service = new TenantContextService(mockRequest as any);
        expect(service.getTenantId()).toBeNull();
        expect(service.isSystemContext()).toBe(true);
    });

    it('should validate tenant access and detect violations', async () => {
        service = new TenantContextService(mockRequest as any);

        const canAccessOwn = await service.validateTenantAccess('client-a');
        expect(canAccessOwn).toBe(true);

        const canAccessOther = await service.validateTenantAccess('client-b');
        expect(canAccessOther).toBe(false);
    });

    it('should sanitize tenant id', () => {
        mockRequest.headers['x-tenant-id'] = 'Admin; DROP TABLE users;';
        service = new TenantContextService(mockRequest as any);
        expect(service.getTenantSchema()).toBe('tenant_admin__drop_table_users_');
    });
});
