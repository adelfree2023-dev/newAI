import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantConnectionService implements OnModuleInit {
    private readonly logger = new Logger(TenantConnectionService.name);
    private initializedSchemas = new Set<string>();

    constructor(
        private readonly prisma: PrismaService,
        private readonly tenantContext: TenantContextService,
        private readonly auditService: AuditService
    ) { }

    async onModuleInit() {
        this.logger.log('🏗️ [M2] بدء تهيئة خدمة اتصال المستأجرين...');
        this.logger.log('✅ [M2] تم تهيئة خدمة اتصال المستأجرين بنجاح');
    }

    /**
     * الحصول على اسم مخطط المستأجر
     */
    getSchemaName(tenantId: string): string {
        const safeId = tenantId.toLowerCase()
            .replace(/[^a-z0-9-_]/g, '_')
            .replace(/_{2,}/g, '_')
            .trim()
            .slice(0, 50);

        return `tenant_${safeId}`;
    }

    /**
     * التحقق من وجود مخطط المستأجر
     */
    async schemaExists(tenantId: string): Promise<boolean> {
        const schemaName = this.getSchemaName(tenantId);
        try {
            const result: any[] = await this.prisma.$queryRawUnsafe(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                schemaName
            );
            return result.length > 0;
        } catch (error) {
            this.logger.error(`❌ [M2] فشل التحقق من وجود المخطط: ${error.message}`);
            return false;
        }
    }

    /**
     * تهيئة مخطط المستأجر (إنشاءه إذا لم يكن موجوداً)
     */
    async initializeTenantSchema(tenantId: string, tenantName: string): Promise<boolean> {
        const schemaName = this.getSchemaName(tenantId);

        if (this.initializedSchemas.has(schemaName)) {
            this.logger.debug(`[M2] ✅ المخطط موجود مسبقاً في الذاكرة: ${schemaName}`);
            return true;
        }

        try {
            const exists = await this.schemaExists(tenantId);

            if (!exists) {
                this.logger.log(`[M2] 🏗️ إنشاء مخطط جديد للمستأجر: ${tenantName} (${tenantId})`);

                // إنشاء المخطط
                await this.prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

                // إنشاء الجداول الأساسية
                await this.createBaseTables(schemaName, tenantId);

                // تسجيل الحدث
                await this.auditService.logBusinessEvent('TENANT_SCHEMA_CREATED', {
                    tenantId,
                    schemaName,
                    tenantName,
                    timestamp: new Date().toISOString()
                });
            }

            this.initializedSchemas.add(schemaName);
            this.logger.log(`✅ [M2] تم تهيئة المخطط بنجاح: ${schemaName}`);
            return true;

        } catch (error) {
            this.logger.error(`❌ [M2] فشل تهيئة مخطط المستأجر ${tenantId}: ${error.message}`);

            await this.auditService.logSecurityEvent('SCHEMA_INITIALIZATION_FAILURE', {
                tenantId,
                schemaName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * إنشاء الجداول الأساسية في مخطط المستأجر
     */
    private async createBaseTables(schemaName: string, tenantId: string) {
        // إنشاء الجداول الأساسية باستخدام Prisma Raw SQL
        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schemaName}"."users" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                "passwordHash" VARCHAR(255) NOT NULL,
                "firstName" VARCHAR(100),
                "lastName" VARCHAR(100),
                role VARCHAR(20) DEFAULT 'CUSTOMER',
                status VARCHAR(20) DEFAULT 'ACTIVE',
                "tenantId" VARCHAR(50) DEFAULT '${tenantId}',
                "isTwoFactorEnabled" BOOLEAN DEFAULT FALSE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_${schemaName}_users_email" ON "${schemaName}"."users" (email)
        `);

        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schemaName}"."products" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(10, 2) NOT NULL,
                "stockQuantity" INTEGER DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "tenantId" VARCHAR(50) DEFAULT '${tenantId}'
            )
        `);

        await this.prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "idx_${schemaName}_products_name" ON "${schemaName}"."products" (name)
        `);

        await this.prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "${schemaName}"."settings" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key VARCHAR(100) NOT NULL UNIQUE,
                value TEXT NOT NULL,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.logger.log(`[M2] ✅ تم إنشاء الجداول الأساسية في المخطط: ${schemaName}`);
    }

    async executeInTenantContext<T>(
        tenantId: string,
        callback: (prisma: any) => Promise<T>
    ): Promise<T> {
        if (!(await this.schemaExists(tenantId))) {
            throw new NotFoundException(`مخطط المستأجر غير موجود: ${tenantId}`);
        }

        const schemaName = this.getSchemaName(tenantId);

        try {
            // تعيين مخطط المستأجر في الجلسة الحالية
            await this.prisma.$executeRawUnsafe(`SET search_path TO "${schemaName}", public`);

            // تنفيذ الاستعلام عبر الكولباك (نمرر كائن البريزما نفسه)
            const result = await callback(this.prisma);

            await this.auditService.logBusinessEvent('TENANT_QUERY_EXECUTED', {
                tenantId,
                schemaName,
                timestamp: new Date().toISOString()
            });

            return result;
        } catch (error) {
            this.logger.error(`[M2] ❌ فشل تنفيذ الاستعلام في سياق المستأجر: ${error.message}`);

            await this.auditService.logSecurityEvent('TENANT_QUERY_FAILURE', {
                tenantId,
                schemaName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw error;
        } finally {
            // إعادة ضبط الـ search_path للأمان
            await this.prisma.$executeRawUnsafe(`SET search_path TO public`);
        }
    }

    async validateIsolationIntegrity(tenantId: string): Promise<boolean> {
        const schemaName = this.getSchemaName(tenantId);

        try {
            const schemaExistsResult: any[] = await this.prisma.$queryRawUnsafe(
                `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1`,
                schemaName
            );

            if (schemaExistsResult.length === 0) {
                this.logger.error(`[M2] ❌ المخطط غير موجود: ${schemaName}`);
                return false;
            }

            const tables = ['users', 'products', 'settings'];
            for (const table of tables) {
                const tableExists: any[] = await this.prisma.$queryRawUnsafe(
                    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
                    schemaName, table
                );

                if (!tableExists[0].exists) {
                    this.logger.error(`[M2] ❌ الجدول غير موجود: ${schemaName}.${table}`);
                    return false;
                }
            }

            this.logger.log(`[M2] ✅ نجاح التحقق من سلامة عزل المخطط: ${schemaName}`);
            return true;

        } catch (error) {
            this.logger.error(`[M2] ❌ فشل التحقق من سلامة العزل: ${error.message}`);
            return false;
        }
    }

    async dropTenantSchema(tenantId: string): Promise<boolean> {
        const schemaName = this.getSchemaName(tenantId);

        try {
            const exists = await this.schemaExists(tenantId);
            if (!exists) {
                this.logger.warn(`[M2] ⚠️ المخطط غير موجود للمستأجر: ${tenantId}`);
                return false;
            }

            // حذف المخطط بالكامل
            await this.prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

            // إزالة من الذاكرة المؤقتة
            this.initializedSchemas.delete(schemaName);

            await this.auditService.logBusinessEvent('TENANT_SCHEMA_DELETED', {
                tenantId,
                schemaName,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`[M2] ✅ تم حذف المخطط بنجاح: ${schemaName}`);
            return true;

        } catch (error) {
            this.logger.error(`[M2] ❌ فشل حذف مخطط المستأجر ${tenantId}: ${error.message}`);

            await this.auditService.logSecurityEvent('SCHEMA_DELETION_FAILURE', {
                tenantId,
                schemaName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw new Error(`فشل في حذف مخطط المستأجر: ${error.message}`);
        }
    }
}
