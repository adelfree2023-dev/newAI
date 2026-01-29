import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';

@Injectable()
export class ProductService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService
    ) { }

    async findProductsByTenant(tenantId: string, page: number = 1, limit: number = 10, search?: string, category?: string) {
        if (search && search.length > 100) {
            throw new HttpException('نص البحث طويل جداً', HttpStatus.BAD_REQUEST);
        }

        const skip = (page - 1) * limit;
        const where: any = {
            tenantId,
            status: 'ACTIVE'
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];

            // Assuming logActivity is a method we might need to add or using logBusinessEvent
            this.auditService.logBusinessEvent('PRODUCT_SEARCH', { tenantId, searchQuery: search });
        }

        if (category) {
            where.category = category;
        }

        const [items, total] = await Promise.all([
            this.prisma.product.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prisma.product.count({ where })
        ]);

        return { items, total };
    }

    async findOneByTenant(tenantId: string, id: string) {
        try {
            const product = await this.prisma.product.findFirst({
                where: { id, tenantId }
            });

            if (!product) {
                this.auditService.logSecurityEvent('PRODUCT_NOT_FOUND', { tenantId, productId: id });
                return null;
            }

            return product;
        } catch (error) {
            throw new HttpException('خطأ في استرجاع بيانات المنتج', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    async createProduct(tenantId: string, productData: any) {
        const product = await this.prisma.product.create({
            data: {
                ...productData,
                tenantId
            }
        });

        this.auditService.logBusinessEvent('PRODUCT_CREATED', { tenantId, productId: product.id });
        return product;
    }

    async getProducts(tenantId: string) {
        return this.prisma.product.findMany({
            where: { tenantId }
        });
    }

    async createCustomer(tenantId: string, customerData: any) {
        // This was previously creating a user in tenant context.
        // We'll use the User model but with the correct tenantId.
        const user = await this.prisma.user.create({
            data: {
                ...customerData,
                passwordHash: 'hashed_password', // Placeholder as per previous code
                role: 'CUSTOMER',
                tenantId
            }
        });

        this.auditService.logBusinessEvent('CUSTOMER_CREATED', { tenantId, userId: user.id });
        return user;
    }

    async getCustomers(tenantId: string) {
        return this.prisma.user.findMany({
            where: { tenantId, role: 'CUSTOMER' }
        });
    }

    async deleteProduct(tenantId: string, id: string) {
        await this.prisma.product.deleteMany({
            where: { id, tenantId }
        });

        this.auditService.logBusinessEvent('PRODUCT_DELETED', { tenantId, productId: id });
        return { success: true, message: `Product ${id} deleted` };
    }
}
