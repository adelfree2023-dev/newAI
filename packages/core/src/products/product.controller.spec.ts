import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ProductController', () => {
    let controller: ProductController;
    let service: jest.Mocked<ProductService>;

    beforeEach(async () => {
        const mockProductService = {
            createProduct: jest.fn(),
            getProducts: jest.fn(),
            createCustomer: jest.fn(),
            getCustomers: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [ProductController],
            providers: [
                {
                    provide: ProductService,
                    useValue: mockProductService,
                },
            ],
        }).compile();

        controller = module.get<ProductController>(ProductController);
        service = module.get(ProductService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('createProduct', () => {
        it('should throw FORBIDDEN if tenant ID is missing', async () => {
            await expect(controller.createProduct('', {})).rejects.toThrow(HttpException);
        });

        it('should call service with tenantId and product', async () => {
            const product = { name: 'P' };
            service.createProduct.mockResolvedValue({ id: '1', ...product });
            const result = await controller.createProduct('t1', product);
            expect(result).toEqual({ id: '1', ...product });
            expect(service.createProduct).toHaveBeenCalledWith('t1', product);
        });
    });

    describe('findAllProducts', () => {
        it('should fetch products', async () => {
            service.getProducts.mockResolvedValue([{ id: '1' }]);
            const result = await controller.findAllProducts('t1');
            expect(result).toEqual([{ id: '1' }]);
        });
    });

    describe('createCustomer', () => {
        it('should call service for customer creation', async () => {
            const customer = { email: 'c@a.c' };
            service.createCustomer.mockResolvedValue({ id: 'u1', ...customer });
            const result = await controller.createCustomer('t1', customer);
            expect(result).toEqual({ id: 'u1', ...customer });
        });
    });

    describe('findAllCustomers', () => {
        it('should fetch customers', async () => {
            service.getCustomers.mockResolvedValue([]);
            const result = await controller.findAllCustomers('t1');
            expect(result).toEqual([]);
        });
    });
});
