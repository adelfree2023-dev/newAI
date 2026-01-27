import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { TenantConnectionService } from '../tenants/database/tenant-connection.service';

describe('ProductService', () => {
    let service: ProductService;
    let tenantConnection: jest.Mocked<TenantConnectionService>;

    beforeEach(async () => {
        const mockTenantConnection = {
            executeInTenantContext: jest.fn(),
            getSchemaName: jest.fn().mockReturnValue('tenant_123'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ProductService,
                {
                    provide: TenantConnectionService,
                    useValue: mockTenantConnection,
                },
            ],
        }).compile();

        service = module.get<ProductService>(ProductService);
        tenantConnection = module.get(TenantConnectionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createProduct', () => {
        it('should execute raw SQL to insert a product', async () => {
            const product = { name: 'Test', description: 'Desc', price: 100, stock_quantity: 10 };
            const mockResult = [{ id: 'uuid-1', ...product }];

            tenantConnection.executeInTenantContext.mockImplementation(async (tid, cb) => {
                const mockQueryRunner = { query: jest.fn().mockResolvedValue(mockResult) };
                return cb(mockQueryRunner as any);
            });

            const result = await service.createProduct('t1', product);
            expect(result).toEqual(mockResult[0]);
            expect(tenantConnection.executeInTenantContext).toHaveBeenCalled();
        });
    });

    describe('getProducts', () => {
        it('should fetch products from tenant schema', async () => {
            const mockProducts = [{ id: '1', name: 'P1' }];
            tenantConnection.executeInTenantContext.mockImplementation(async (tid, cb) => {
                const mockQueryRunner = { query: jest.fn().mockResolvedValue(mockProducts) };
                return cb(mockQueryRunner as any);
            });

            const result = await service.getProducts('t1');
            expect(result).toEqual(mockProducts);
        });
    });

    describe('createCustomer', () => {
        it('should create a customer (user) in tenant schema', async () => {
            const customer = { email: 'c@a.c', firstName: 'F', lastName: 'L' };
            const mockUser = { id: 'u1', ...customer };

            tenantConnection.executeInTenantContext.mockImplementation(async (tid, cb) => {
                const mockQueryRunner = { query: jest.fn().mockResolvedValue([mockUser]) };
                return cb(mockQueryRunner as any);
            });

            const result = await service.createCustomer('t1', customer);
            expect(result).toEqual(mockUser);
        });
    });

    describe('getCustomers', () => {
        it('should fetch customers from tenant schema', async () => {
            const mockCustomers = [{ id: 'u1', email: 'c@a.c' }];
            tenantConnection.executeInTenantContext.mockImplementation(async (tid, cb) => {
                const mockQueryRunner = { query: jest.fn().mockResolvedValue(mockCustomers) };
                return cb(mockQueryRunner as any);
            });

            const result = await service.getCustomers('t1');
            expect(result).toEqual(mockCustomers);
        });
    });
});
