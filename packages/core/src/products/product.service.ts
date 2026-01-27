import { Injectable } from '@nestjs/common';
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
