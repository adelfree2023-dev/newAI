import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus, Delete, Param } from '@nestjs/common';
import { ProductService } from './product.service';

@Controller('products')
export class ProductController {
    constructor(private readonly productService: ProductService) { }

    @Post()
    async createProduct(@Headers('X-Tenant-ID') tenantId: string, @Body() product: any) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        return this.productService.createProduct(tenantId, product);
    }

    @Get()
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

    @Delete(':id')
    async deleteProduct(@Headers('X-Tenant-ID') tenantId: string, @Param('id') id: string) {
        if (!tenantId) throw new HttpException('X-Tenant-ID mandatory', HttpStatus.FORBIDDEN);
        // محاكاة الحذف للاختبار
        return { success: true, message: `Product ${id} deleted` };
    }
}
