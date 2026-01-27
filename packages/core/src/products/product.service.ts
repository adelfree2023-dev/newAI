import { Injectable } from '@nestjs/common';
import { TenantConnectionService } from '../tenants/database/tenant-connection.service';

@Injectable()
export class ProductService {
    constructor(private readonly tenantConnection: TenantConnectionService) { }

    async createProduct(tenantId: string, product: any) {
        return this.tenantConnection.executeInTenantContext(tenantId, async (queryRunner) => {
            const schemaName = this.tenantConnection.getSchemaName(tenantId);
            const result = await queryRunner.query(
                `INSERT INTO "${schemaName}"."products" (name, description, price, "stockQuantity") VALUES ($1, $2, $3, $4) RETURNING *`,
                [product.name, product.description, product.price, product.stockQuantity]
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
                `INSERT INTO "${schemaName}"."users" (email, "passwordHash", "firstName", "lastName", role) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
                [customer.email, 'hashed_password', customer.firstName, customer.lastName, 'CUSTOMER']
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

    async deleteProduct(tenantId: string, id: string) {
        return this.tenantConnection.executeInTenantContext(tenantId, async (queryRunner) => {
            const schemaName = this.tenantConnection.getSchemaName(tenantId);
            await queryRunner.query(`DELETE FROM "${schemaName}"."products" WHERE id = $1`, [id]);
            return { success: true, message: `Product ${id} deleted` };
        });
    }
}
