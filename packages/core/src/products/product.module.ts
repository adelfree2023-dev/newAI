import { Controller, Get, Post, Body, Headers, HttpException, HttpStatus, Injectable, Module } from '@nestjs/common';
import { TenantConnectionService } from '../tenants/database/tenant-connection.service';

@Injectable()
export class ProductService {
    constructor(private readonly tenantConnection: TenantConnectionService) { }

    async createProduct(tenantId: string, product: any) {
        return this.tenantConnection.executeInTenantContext(tenantId, async (queryRunner) => {
            const schemaName = this.tenantConnection.getSchemaName(tenantId);
            const result = await queryRunner.query(
                `INSERT INTO "${schemaName}"."products" (name, description, price, stock_quantity) VALUES ($1, $2, $3, $4) RETURNING *`,
                [product.name, product.description, product.price, product.stock_quantity]
            );
            return result[0];
        });
    }

    async getProducts(tenantId: string) {
        return this.tenantConnection.executeInTenantContext(tenantId, async (queryRunner) => {
            const schemaName = this.tenantConnection.getSchemaName(tenantId);
            return queryRunner.query(`SELECT * FROM "${schemaName}"."products"`);
        });
    }

    async createCustomer(tenantId: string, customer: any) {
        return this.tenantConnection.executeInTenantContext(tenantId, async (queryRunner) => {
            const schemaName = this.tenantConnection.getSchemaName(tenantId);
            const result = await queryRunner.query(
                `INSERT INTO "${schemaName}"."users" (email, password_hash, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [customer.email, 'hashed_password', customer.firstName, customer.lastName, 'USER']
            );
            return result[0];
        });
    }

    async getCustomers(tenantId: string) {
        return this.tenantConnection.executeInTenantContext(tenantId, async (queryRunner) => {
            const schemaName = this.tenantConnection.getSchemaName(tenantId);
            return queryRunner.query(`SELECT * FROM "${schemaName}"."users"`);
        });
    }
}

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

@Module({
    providers: [ProductService],
    controllers: [BusinessController],
    exports: [ProductService]
})
export class ProductModule { }
