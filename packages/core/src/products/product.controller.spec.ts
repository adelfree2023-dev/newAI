import { Test, TestingModule } from '@nestjs/testing';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { HttpException } from '@nestjs/common';

describe('ProductController', () => {
    let controller: ProductController;
    let service: jest.Mocked<ProductService>;

    beforeEach(async () => {
        const mockProductService = {
            createProduct: jest.fn(),
            getProducts: jest.fn(),
            deleteProduct: jest.fn(),
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
            service.createProduct.mockResolvedValue({ id: '1', ...product } as any);
            const result = await controller.createProduct('t1', product);
            expect(result).toEqual({ id: '1', ...product });
            expect(service.createProduct).toHaveBeenCalledWith('t1', product);
        });
    });

    describe('findAllProducts', () => {
        it('should fetch products', async () => {
            service.getProducts.mockResolvedValue([{ id: '1' }] as any);
            const result = await controller.findAllProducts('t1');
            expect(result).toEqual([{ id: '1' }]);
        });
    });

    describe('deleteProduct', () => {
        it('should delete product', async () => {
            service.deleteProduct.mockResolvedValue({ success: true, message: 'Deleted' } as any);
            const result = await controller.deleteProduct('t1', 'p1');
            expect(result.success).toBe(true);
            expect(service.deleteProduct).toHaveBeenCalledWith('t1', 'p1');
        });
    });
});
