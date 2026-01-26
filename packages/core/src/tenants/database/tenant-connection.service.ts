import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';

@Injectable()
export class TenantConnectionService implements OnModuleInit {
    private readonly logger = new Logger(TenantConnectionService.name);
    private initializedSchemas = new Set<string>();

    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
        private readonly tenantContext: TenantContextService,
        private readonly auditService: AuditService
    ) { }

    async onModuleInit() {
        this.logger.log('🏗️ [M2] بدء تهيئة خدمة اتصال المستأجرين...');

        // التحقق من اتصال قاعدة البيانات
        if (!this.dataSource.isInitialized) {
            throw new Error('فشل في تهيئة اتصال قاعدة البيانات');
        }

        this.logger.log('✅ [M2] تم تهيئة خدمة اتصال المستأجرين بنجاح');
    }

    /**
     * الحصول على اسم مخطط المستأجر
     */
    getSchemaName(tenantId: string): string {
        // تنظيف tenantId لمنع حقن SQL
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
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            return await queryRunner.hasSchema(schemaName);
        } finally {
            await queryRunner.release();
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

        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            // التحقق من وجود المخطط
            const exists = await queryRunner.hasSchema(schemaName);

            if (!exists) {
                this.logger.log(`[M2] 🏗️ إنشاء مخطط جديد للمستأجر: ${tenantName} (${tenantId})`);

                // إنشاء المخطط
                await queryRunner.createSchema(schemaName, true);

                // إنشاء الجداول الأساسية
                await this.createBaseTables(queryRunner, schemaName, tenantId);

                // تسجيل الحدث
                await this.auditService.logBusinessEvent('TENANT_SCHEMA_CREATED', {
                    tenantId,
                    schemaName,
                    tenantName,
                    timestamp: new Date().toISOString()
                });
            }

            await queryRunner.commitTransaction();
            this.initializedSchemas.add(schemaName);

            this.logger.log(`✅ [M2] تم تهيئة المخطط بنجاح: ${schemaName}`);
            return true;

        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }

            this.logger.error(`❌ [M2] فشل تهيئة مخطط المستأجر ${tenantId}: ${error.message}`);

            await this.auditService.logSecurityEvent('SCHEMA_INITIALIZATION_FAILURE', {
                tenantId,
                schemaName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * إنشاء الجداول الأساسية في مخطط المستأجر
     */
    private async createBaseTables(queryRunner: any, schemaName: string, tenantId: string) {
        // إنشاء جدول المستخدمين
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."users" (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'STORE_MANAGER')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        tenant_id VARCHAR(36) NOT NULL DEFAULT '${tenantId}'
      )
    `);

        // إنشاء فهرس على البريد الإلكتروني
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_${schemaName}_users_email" ON "${schemaName}"."users" (email)
    `);

        // إنشاء جدول المنتجات
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."products" (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        stock_quantity INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        tenant_id VARCHAR(36) NOT NULL DEFAULT '${tenantId}'
      )
    `);

        // إنشاء جدول الإعدادات
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."settings" (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

        this.logger.log(`[M2] ✅ تم إنشاء الجداول الأساسية في المخطط: ${schemaName}`);
    }

    /**
     * تنفيذ استعلام في سياق مخطط المستأجر
     */
    async executeInTenantContext<T>(
        tenantId: string,
        callback: (queryRunner: any) => Promise<T>
    ): Promise<T> {
        // التأكد من تهيئة المخطط
        if (!(await this.schemaExists(tenantId))) {
            throw new Error(`مخطط المستأجر غير موجود: ${tenantId}`);
        }

        const schemaName = this.getSchemaName(tenantId);
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();

            // تعيين مخطط المستأجر للاتصال الحالي
            await queryRunner.query(`SET search_path TO "${schemaName}", public`);

            // تنفيذ الاستعلام
            const result = await callback(queryRunner);

            // تسجيل النجاح
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
            await queryRunner.release();
        }
    }

    /**
     * التحقق من سلامة عزل المخطط
     */
    async validateIsolationIntegrity(tenantId: string): Promise<boolean> {
        const schemaName = this.getSchemaName(tenantId);
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();

            // 1. التحقق من وجود المخطط
            const schemaExists = await queryRunner.hasSchema(schemaName);
            if (!schemaExists) {
                this.logger.error(`[M2] ❌ المخطط غير موجود: ${schemaName}`);
                return false;
            }

            // 2. التحقق من وجود الجداول الأساسية
            const tables = ['users', 'products', 'settings'];
            for (const table of tables) {
                const tableExists = await queryRunner.query(
                    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2)`,
                    [schemaName, table]
                );

                if (!tableExists[0].exists) {
                    this.logger.error(`[M2] ❌ الجدول غير موجود: ${schemaName}.${table}`);
                    return false;
                }
            }

            // 3. التحقق من وجود عمود tenant_id
            const hasTenantId = await queryRunner.query(
                `SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'users' AND column_name = 'tenant_id')`,
                [schemaName]
            );

            if (!hasTenantId[0].exists) {
                this.logger.error(`[M2] ❌ عمود tenant_id غير موجود في جدول المستخدمين`);
                return false;
            }

            this.logger.log(`[M2] ✅ نجاح التحقق من سلامة عزل المخطط: ${schemaName}`);
            return true;

        } catch (error) {
            this.logger.error(`[M2] ❌ فشل التحقق من سلامة العزل: ${error.message}`);
            return false;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * حذف مخطط المستأجر (للإلغاء أو إعادة التهيئة)
     */
    async dropTenantSchema(tenantId: string): Promise<boolean> {
        const schemaName = this.getSchemaName(tenantId);
        const queryRunner = this.dataSource.createQueryRunner();

        try {
            await queryRunner.connect();
            await queryRunner.startTransaction();

            // التحقق من وجود المخطط
            const exists = await queryRunner.hasSchema(schemaName);
            if (!exists) {
                this.logger.warn(`[M2] ⚠️ المخطط غير موجود للمستأجر: ${tenantId}`);
                await queryRunner.commitTransaction();
                return false;
            }

            // حذف المخطط بالكامل
            await queryRunner.dropSchema(schemaName, true);

            // إزالة من الذاكرة المؤقتة
            this.initializedSchemas.delete(schemaName);

            await queryRunner.commitTransaction();

            await this.auditService.logBusinessEvent('TENANT_SCHEMA_DELETED', {
                tenantId,
                schemaName,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`[M2] ✅ تم حذف المخطط بنجاح: ${schemaName}`);
            return true;

        } catch (error) {
            await queryRunner.rollbackTransaction();

            this.logger.error(`[M2] ❌ فشل حذف مخطط المستأجر ${tenantId}: ${error.message}`);

            await this.auditService.logSecurityEvent('SCHEMA_DELETION_FAILURE', {
                tenantId,
                schemaName,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw new Error(`فشل في حذف مخطط المستأجر: ${error.message}`);
        } finally {
            await queryRunner.release();
        }
    }
}
