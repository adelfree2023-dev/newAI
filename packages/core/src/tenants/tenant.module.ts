import { Module, Global, OnModuleInit } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { SchemaManagerService } from './database/schema-manager.service';
import { TenantDatabaseService } from './database/tenant-database.service';
import { IsolationValidatorService } from './database/isolation-validator.service';
import { TenantContextMiddleware } from './context/tenant-context.middleware';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../security/layers/s7-encryption/encryption.service';
import { VercelAgentFactory } from '../security/ai-supervisor/vercel-integration/vercel-agent-factory';
import { AISupervisorModule } from '../security/ai-supervisor/ai-supervisor.module';
import { VercelSkillMapper } from '../security/ai-supervisor/vercel-integration/vercel-skill-mapper';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextInterceptor } from './context/tenant-context.interceptor';
import { Scope } from '@nestjs/common';

@Global()
@Module({
  imports: [AISupervisorModule],
  providers: [
    TenantService,
    SchemaManagerService,
    {
      provide: TenantDatabaseService,
      useClass: TenantDatabaseService,
      scope: Scope.REQUEST
    },
    IsolationValidatorService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor
    }
  ],
  exports: [
    TenantService,
    TenantDatabaseService,
    SchemaManagerService,
    IsolationValidatorService
  ],
})
export class TenantModule implements OnModuleInit {
  constructor(
    private readonly schemaManager: SchemaManagerService,
    private readonly tenantService: TenantService
  ) { }

  async onModuleInit() {
    try {
      this.schemaManager.logger.log('🏗️ [M2] 🔄 بدء تهيئة نظام المستأجرين...');

      // التحقق من وجود مخطط النظام
      await this.schemaManager.ensureSystemSchemaExists();

      // تحميل المستأجرين النشطين
      await this.tenantService.loadActiveTenants();

      this.schemaManager.logger.log('✅ [M2] ✅ اكتملت تهيئة نظام المستأجرين بنجاح');
    } catch (error) {
      this.schemaManager.logger.error(`❌ [M2] ❌ فشل تهيئة نظام المستأجرين: ${error.message}`);

      // في حالة الفشل، محاولة الاسترداد
      if (error.message.includes('DATABASE_CONNECTION_FAILED')) {
        this.schemaManager.logger.error('[M2] 🚨 اتصال قاعدة البيانات فاشل. النظام سيعمل في وضع آمن');
        // سيتم تطوير آلية الاسترداد الكاملة لاحقاً
      } else {
        throw error;
      }
    }
  }
}