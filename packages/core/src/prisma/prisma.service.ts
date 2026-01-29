import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor(private readonly tenantContext?: TenantContextService) {
        super();
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * تنفيذ استعلام في سياق مستأجر معين
     */
    async withTenant<T>(tenantId: string, callback: () => Promise<T>): Promise<T> {
        if (this.tenantContext) {
            this.tenantContext.setTenantId(tenantId);
        }
        try {
            return await callback();
        } finally {
            if (this.tenantContext && (this.tenantContext as any).clearTenantId) {
                (this.tenantContext as any).clearTenantId();
            }
        }
    }

    /**
     * محاولة الاتصال مع إعادة المحاولة
     */
    async connectWithRetry(retries = 5, delay = 1000): Promise<void> {
        for (let i = 0; i < retries; i++) {
            try {
                await this.$connect();
                return;
            } catch (error) {
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}
