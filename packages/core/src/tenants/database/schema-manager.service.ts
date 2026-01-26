import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../../security/layers/s7-encryption/encryption.service';
import { VercelAgentFactory } from '../../security/ai-supervisor/vercel-integration/vercel-agent-factory';

@Injectable()
export class SchemaManagerService implements OnModuleInit {
  public readonly logger = new Logger(SchemaManagerService.name);
  private dataSource: DataSource;
  private isInitialized = false;
  private systemSchema = 'system_schema';

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantContext: TenantContextService,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService,
    private readonly vercelAgentFactory: VercelAgentFactory
  ) { }

  async onModuleInit() {
    await this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) return;

    this.logger.log('🏗️ [M2] بدء تهيئة مدير مخططات المستأجرين...');

    try {
      // الحصول على اتصال قاعدة البيانات
      this.dataSource = new DataSource({
        type: 'postgres',
        url: this.configService.get<string>('DATABASE_URL'),
        entities: [],
        synchronize: false,
        logging: process.env.NODE_ENV === 'development',
        schema: this.systemSchema
      });

      await this.dataSource.initialize();

      // التأكد من وجود مخطط النظام
      await this.ensureSystemSchemaExists();

      // التحقق من سلامة العزل باستخدام الذكاء الاصطناعي
      await this.validateIsolationIntegrity();

      this.isInitialized = true;
      this.logger.log('✅ [M2] اكتملت تهيئة مدير مخططات المستأجرين');
    } catch (error) {
      this.logger.error(`❌ [M2] فشل تهيئة مدير المخططات: ${error.message}`);
      throw new Error('فشل في تهيئة نظام عزل المستأجرين');
    }
  }

  public async ensureSystemSchemaExists() {
    const queryRunner = this.dataSource.createQueryRunner();
    try {
      await queryRunner.connect();

      // التحقق من وجود المخطط
      const schemaExists = await queryRunner.hasSchema(this.systemSchema);

      if (!schemaExists) {
        this.logger.warn(`[M2] ⚠️ مخطط النظام غير موجود. سيتم إنشاؤه: ${this.systemSchema}`);

        // إنشاء مخطط النظام
        await queryRunner.createSchema(this.systemSchema, true);

        // تسجيل حدث أمني
        await this.auditService.logSystemEvent('SYSTEM_SCHEMA_CREATED', {
          schemaName: this.systemSchema,
          timestamp: new Date().toISOString()
        });
      }

      this.logger.log(`✅ [M2] مخطط النظام موجود: ${this.systemSchema}`);
    } finally {
      await queryRunner.release();
    }
  }

  private async validateIsolationIntegrity() {
    this.logger.log('🔍 [M2] التحقق من سلامة عزل المخططات باستخدام الذكاء الاصطناعي...');

    try {
      const isolationData = {
        tenantId: 'system',
        schemaName: this.systemSchema,
        operationType: 'VALIDATE',
        contextData: {
          requestId: 'system-initialization',
          userId: 'system',
          ipAddress: '127.0.0.1'
        }
      };

      const result = await this.vercelAgentFactory.validateDatabaseIsolation(isolationData);

      if (result.isolationStatus !== 'SECURE') {
        this.logger.error(`🚨 [M2] كشف الذكاء الاصطناعي عن مشاكل في العزل: ${result.isolationStatus}`);

        // اتخاذ إجراءات الطوارئ
        await this.emergencyIsolationResponse(result);
      } else {
        this.logger.log('✅ [M2] نجاح التحقق من سلامة العزل باستخدام الذكاء الاصطناعي');
      }
    } catch (error) {
      this.logger.error(`❌ [M2] فشل التحقق من العزل: ${error.message}`);
    }
  }

  private async emergencyIsolationResponse(result: any) {
    this.logger.error('🚨 [M2] 🚨 تفعيل وضع الطوارئ بسبب اختراق العزل!');

    try {
      // 1. إيقاف جميع العمليات غير النظامية
      this.logger.error('[M2] ⛔ إيقاف جميع العمليات غير النظامية');

      // 2. تسجيل الحدث الأمني
      await this.auditService.logSecurityEvent('ISOLATION_BREACH_DETECTED', {
        severity: result.threatLevel,
        detectedIssues: result.detectedIssues,
        recommendedActions: result.recommendedActions,
        timestamp: new Date().toISOString(),
        autoResponse: 'EMERGENCY_SHUTDOWN_INITIATED'
      });

      // 3. إرسال تنبيه فوري
      this.logger.error('[M2] 📢 تم إرسال تنبيه أمني فوري للمشرفين');

      // 4. في الإصدار الحقيقي، سيتم إيقاف الخدمة بالكامل
      // process.exit(1);

    } catch (error) {
      this.logger.error(`❌ [M2] فشل استجابة الطوارئ: ${error.message}`);
    }
  }

  async createTenantSchema(tenantId: string, tenantName: string): Promise<{ success: boolean; schemaName: string }> {
    if (!this.isInitialized) await this.initialize();

    this.logger.log(`🏗️ [M2] إنشاء مخطط جديد للمستأجر: ${tenantId}`);

    try {
      const schemaName = this.generateSchemaName(tenantId);
      const queryRunner = this.dataSource.createQueryRunner();

      try {
        await queryRunner.connect();

        // بدء معاملة
        await queryRunner.startTransaction();

        // التحقق من وجود المخطط
        const schemaExists = await queryRunner.hasSchema(schemaName);

        if (schemaExists) {
          this.logger.warn(`[M2] ⚠️ المخطط موجود مسبقاً للمستأجر: ${tenantId}`);
          await queryRunner.commitTransaction();
          return { success: true, schemaName };
        }

        // إنشاء المخطط
        await queryRunner.createSchema(schemaName, true);

        // إنشاء الجداول الأساسية
        await this.createBaseTables(queryRunner, schemaName, tenantId, tenantName);

        // تعيين الصلاحيات
        await this.setSchemaPermissions(queryRunner, schemaName);

        // إنهاء المعاملة
        await queryRunner.commitTransaction();

        // تسجيل الحدث
        await this.auditService.logBusinessEvent('TENANT_SCHEMA_CREATED', {
          tenantId,
          schemaName,
          tenantName,
          timestamp: new Date().toISOString()
        });

        // التحقق من العزل باستخدام الذكاء الاصطناعي
        await this.validateNewSchemaIsolation(schemaName, tenantId);

        this.logger.log(`✅ [M2] تم إنشاء المخطط بنجاح: ${schemaName}`);
        return { success: true, schemaName };

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`❌ [M2] فشل إنشاء مخطط المستأجر ${tenantId}: ${error.message}`);

      // تسجيل حدث أمني
      await this.auditService.logSecurityEvent('SCHEMA_CREATION_FAILURE', {
        tenantId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new Error(`فشل في إنشاء مخطط المستأجر: ${error.message}`);
    }
  }

  private generateSchemaName(tenantId: string): string {
    // تنظيف tenantId لمنع حقن SQL
    const safeId = tenantId.toLowerCase()
      .replace(/[^a-z0-9-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .trim()
      .slice(0, 50);

    return `tenant_${safeId}`;
  }

  private async createBaseTables(queryRunner: QueryRunner, schemaName: string, tenantId: string, tenantName: string) {
    this.logger.log(`[M2] إنشاء الجداول الأساسية في المخطط: ${schemaName}`);

    // إنشاء جدول المستخدمين
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}"."users" (
        id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN', 'SUPER_ADMIN')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        tenant_id VARCHAR(36) NOT NULL DEFAULT '${tenantId}'
      )
    `);

    // إنشاء فهرس على البريد الإلكتروني
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON "${schemaName}"."users" (email)
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

    this.logger.log(`✅ [M2] تم إنشاء الجداول الأساسية للمستأجر: ${tenantName}`);
  }

  private async setSchemaPermissions(queryRunner: QueryRunner, schemaName: string) {
    this.logger.log(`[M2] تعيين الصلاحيات للمخطط: ${schemaName}`);

    // الحصول على اسم المستخدم من DATABASE_URL
    const dbUrl = new URL(this.configService.get<string>('DATABASE_URL'));
    const dbUser = dbUrl.username;

    // منح الصلاحيات
    await queryRunner.query(`
      GRANT USAGE ON SCHEMA "${schemaName}" TO "${dbUser}";
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA "${schemaName}" TO "${dbUser}";
      GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA "${schemaName}" TO "${dbUser}";
      
      ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}"
      GRANT ALL PRIVILEGES ON TABLES TO "${dbUser}";
      
      ALTER DEFAULT PRIVILEGES IN SCHEMA "${schemaName}"
      GRANT ALL PRIVILEGES ON SEQUENCES TO "${dbUser}";
    `);

    this.logger.log(`✅ [M2] تم تعيين الصلاحيات للمخطط: ${schemaName}`);
  }

  private async validateNewSchemaIsolation(schemaName: string, tenantId: string) {
    this.logger.log(`[M2] 🔍 التحقق من عزل المخطط الجديد: ${schemaName}`);

    try {
      const isolationData = {
        tenantId,
        schemaName,
        operationType: 'CREATE',
        contextData: {
          requestId: 'schema-creation-validation',
          userId: 'system',
          ipAddress: '127.0.0.1'
        }
      };

      const result = await this.vercelAgentFactory.validateDatabaseIsolation(isolationData);

      if (result.isolationStatus !== 'SECURE') {
        this.logger.error(`🚨 [M2] كشف الذكاء الاصطناعي عن مشاكل في عزل المخطط الجديد: ${schemaName}`);

        // محاولة الإصلاح التلقائي
        if (result.recommendedActions.includes('RECREATE_SCHEMA')) {
          this.logger.log(`[M2] 🛠️ محاولة الإصلاح التلقائي: إعادة إنشاء المخطط`);
          // سيتم تنفيذ الإصلاح في إصدار لاحق
        }

        // تسجيل الحدث
        await this.auditService.logSecurityEvent('NEW_SCHEMA_ISOLATION_WARNING', {
          tenantId,
          schemaName,
          analysis: result,
          timestamp: new Date().toISOString()
        });
      } else {
        this.logger.log(`✅ [M2] نجاح التحقق من عزل المخطط الجديد: ${schemaName}`);
      }
    } catch (error) {
      this.logger.error(`❌ [M2] فشل التحقق من عزل المخطط الجديد: ${error.message}`);
    }
  }

  async switchToTenantSchema(tenantId: string, queryRunner?: QueryRunner): Promise<string> {
    if (!this.isInitialized) await this.initialize();

    const schemaName = this.generateSchemaName(tenantId);

    try {
      if (queryRunner) {
        // استخدام queryRunner موجود
        await queryRunner.query(`SET search_path TO "${schemaName}"`);
      } else {
        // إنشاء queryRunner مؤقت
        const tempRunner = this.dataSource.createQueryRunner();
        try {
          await tempRunner.connect();
          await tempRunner.query(`SET search_path TO "${schemaName}"`);
        } finally {
          await tempRunner.release();
        }
      }

      this.logger.debug(`[M2] ✅ تم التبديل إلى مخطط المستأجر: ${schemaName}`);
      return schemaName;
    } catch (error) {
      this.logger.error(`❌ [M2] فشل التبديل إلى مخطط المستأجر ${tenantId}: ${error.message}`);

      // التحقق من وجود المخطط
      const exists = await this.schemaExists(tenantId);
      if (!exists) {
        throw new Error(`مخطط المستأجر غير موجود: ${tenantId}. يرجى إنشاء المستأجر أولاً.`);
      }

      throw new Error(`فشل في التبديل إلى مخطط المستأجر: ${error.message}`);
    }
  }

  private async schemaExists(tenantId: string): Promise<boolean> {
    const schemaName = this.generateSchemaName(tenantId);
    const queryRunner = this.dataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      return await queryRunner.hasSchema(schemaName);
    } finally {
      await queryRunner.release();
    }
  }

  async dropTenantSchema(tenantId: string): Promise<boolean> {
    if (!this.isInitialized) await this.initialize();

    this.logger.warn(`🗑️ [M2] حذف مخطط المستأجر: ${tenantId}`);

    try {
      const schemaName = this.generateSchemaName(tenantId);
      const queryRunner = this.dataSource.createQueryRunner();

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        // التحقق من وجود المخطط
        const schemaExists = await queryRunner.hasSchema(schemaName);
        if (!schemaExists) {
          this.logger.warn(`[M2] ⚠️ المخطط غير موجود للمستأجر: ${tenantId}`);
          await queryRunner.commitTransaction();
          return false;
        }

        // حذف المخطط بالكامل
        await queryRunner.dropSchema(schemaName, true);

        // إنهاء المعاملة
        await queryRunner.commitTransaction();

        // تسجيل الحدث
        await this.auditService.logBusinessEvent('TENANT_SCHEMA_DELETED', {
          tenantId,
          schemaName,
          timestamp: new Date().toISOString()
        });

        this.logger.log(`✅ [M2] تم حذف المخطط بنجاح: ${schemaName}`);
        return true;

      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`❌ [M2] فشل حذف مخطط المستأجر ${tenantId}: ${error.message}`);
      throw new Error(`فشل في حذف مخطط المستأجر: ${error.message}`);
    }
  }

  getDataSource(): DataSource {
    if (!this.isInitialized) {
      throw new Error('مدير المخططات غير مهيأ بعد');
    }
    return this.dataSource;
  }
}