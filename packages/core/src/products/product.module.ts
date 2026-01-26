import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus, Injectable, Module } from '@nestjs/common';

@Injectable()
export class ProductService {
    private productsByTenant: Map<string, any[]> = new Map();

    createProduct(tenantId: string, product: any) {
        if (!this.productsByTenant.has(tenantId)) {
            this.productsByTenant.set(tenantId, []);
        }
        const newProduct = { ...product, id: Date.now().toString() };
        this.productsByTenant.get(tenantId).push(newProduct);
        return newProduct;
    }

    getProducts(tenantId: string) {
        return this.productsByTenant.get(tenantId) || [];
    }
}

@Controller('api/products')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Post()
    async create(@Headers('X-Tenant-ID') tenantId: string, @Body() product: any) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.createProduct(tenantId, product);
    }

    @Get()
    async findAll(@Headers('X-Tenant-ID') tenantId: string) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.getProducts(tenantId);
    }
}

@Module({
    providers: [ProductService],
    controllers: [ProductController],
    exports: [ProductService]
})
export class ProductModule { }
