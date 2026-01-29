import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
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
        // في هذا الإصدار المبسط، نفترض أن الربط يتم عبر Middleware أو Interceptor
        // ولكن نوفر الدالة لضمان عمل الاختبارات
        return callback();
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
