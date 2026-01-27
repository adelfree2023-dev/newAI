import { Test, TestingModule } from '@nestjs/testing';
import { BusinessController } from './business.controller';
import { ProductService } from './product.service';
import { HttpException } from '@nestjs/common';

describe('BusinessController', () => {
    let controller: BusinessController;
    let service: jest.Mocked<ProductService>;

    beforeEach(async () => {
        const mockProductService = {
            createProduct: jest.fn(),
            getProducts: jest.fn(),
            createCustomer: jest.fn(),
            getCustomers: jest.fn(),
            deleteProduct: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [BusinessController],
            providers: [
                {
                    provide: ProductService,
                    useValue: mockProductService,
                },
            ],
        }).compile();

        controller = module.get<BusinessController>(BusinessController);
        service = module.get(ProductService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createProduct', () => {
        it('should throw FORBIDDEN if tenant ID is missing', async () => {
            await expect(controller.createProduct('', {})).rejects.toThrow(HttpException);
        });
    });

    describe('createCustomer', () => {
        it('should call service for customer creation', async () => {
            const customer = { email: 'c@a.c' };
            service.createCustomer.mockResolvedValue({ id: 'u1', ...customer } as any);
            const result = await controller.createCustomer('t1', customer);
            expect(result).toEqual({ id: 'u1', ...customer });
        });
    });
});
