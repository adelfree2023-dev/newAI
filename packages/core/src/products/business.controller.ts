import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('api/business')
export class BusinessController {
    constructor(private readonly productService: ProductService) { }

    @Post('products')
    async createProduct(@Headers('X-Tenant-ID') tenantId: string, @Body() product: any) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.createProduct(tenantId, product);
    }

    @Get('products')
    async findAllProducts(@Headers('X-Tenant-ID') tenantId: string) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.getProducts(tenantId);
    }

    @Post('customers')
    async createCustomer(@Headers('X-Tenant-ID') tenantId: string, @Body() customer: any) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.createCustomer(tenantId, customer);
    }

    @Get('customers')
    async findAllCustomers(@Headers('X-Tenant-ID') tenantId: string) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.getCustomers(tenantId);
    }
}
