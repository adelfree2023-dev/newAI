import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus, Delete, Param, UseGuards } from '@nestjs/common';
import { ProductService } from './product.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserRole } from '../auth/entities/user.entity';

@Controller('business')
@UseGuards(JwtAuthGuard)
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

    @Delete('products/:id')
    @UseGuards(RolesGuard)
    @Roles(UserRole.TENANT_ADMIN)
    async deleteProduct(@Param('id') id: string) {
        return { message: 'Product deleted', id };
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
