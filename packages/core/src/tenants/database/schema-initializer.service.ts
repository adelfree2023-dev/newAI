import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TenantConnectionService } from './tenant-connection.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';

@Injectable()
export class SchemaInitializerService implements OnModuleInit {
    private tenantConnection: TenantConnectionService;
    private auditService: AuditService;
    private logger: Logger;
    private isInitialized = false;

    constructor(
        tenantConnection: TenantConnectionService,
        auditService: AuditService
    ) {
        console.log('[DEBUG-ROOT] SchemaInitializerService constructor starting...');
        this.tenantConnection = tenantConnection;
        this.auditService = auditService;
        this.logger = new Logger(SchemaInitializerService.name);

        if (!this.tenantConnection) {
            console.error('[DEBUG-FATAL] tenantConnection is MISSING in constructor!');
        } else {
            console.log('[DEBUG-OK] tenantConnection is present in constructor.');
        }
    }

    async onModuleInit() {
        if (this.isInitialized) return;

        this.safeLog('info', '🔄 [M2] بدء تهيئة مخططات المستأجرين النشطين...');

        try {
            // تهيئة مخطط النظام
            await this.initializeSystemSchema();

            this.isInitialized = true;
            this.safeLog('info', '✅ [M2] اكتملت تهيئة مخططات النظام');

        } catch (error) {
            this.safeLog('error', `[M2] ❌ فشل تهيئة مخططات المستأجرين: ${error.message}`);
            throw error;
        }
    }

    private safeLog(level: 'info' | 'error' | 'warn', message: string) {
        if (this.logger && typeof this.logger.log === 'function') {
            if (level === 'info') this.logger.log(message);
            if (level === 'error') this.logger.error(message);
            if (level === 'warn') this.logger.warn(message);
        } else {
            console.log(`[SAFE-LOG] [${level.toUpperCase()}] ${message}`);
        }
    }

    private async initializeSystemSchema() {
        try {
            // التحقق من وجود مخطط النظام
            const systemSchemaExists = await this.tenantConnection.schemaExists('system');

            if (!systemSchemaExists) {
                this.safeLog('warn', '[M2] ⚠️ إنشاء مخطط النظام...');
                await this.tenantConnection.initializeTenantSchema('system', 'System Schema');
            }

            this.safeLog('info', '[M2] ✅ مخطط النظام جاهز');

        } catch (error) {
            this.safeLog('error', `[M2] ❌ فشل تهيئة مخطط النظام: ${error.message}`);
            throw error;
        }
    }

    /**
     * تهيئة مخطط مستأجر جديد
     */
    async initializeNewTenant(tenantId: string, tenantName: string): Promise<boolean> {
        try {
            const success = await this.tenantConnection.initializeTenantSchema(tenantId, tenantName);

            if (success) {
                this.safeLog('info', `[M2] ✅ تم تهيئة مخطط المستأجر الجديد: ${tenantName}`);

                await this.auditService.logBusinessEvent('NEW_TENANT_INITIALIZED', {
                    tenantId,
                    tenantName,
                    timestamp: new Date().toISOString()
                });
            }

            return success;

        } catch (error) {
            this.safeLog('error', `[M2] ❌ فشل تهيئة مخطط المستأجر الجديد ${tenantName}: ${error.message}`);
            throw error;
        }
    }

    /**
     * التحقق من سلامة جميع المخططات
     */
    async validateAllSchemas(): Promise<{ valid: boolean; issues: string[] }> {
        const issues: string[] = [];

        try {
            // التحقق من مخطط النظام
            const systemValid = await this.tenantConnection.validateIsolationIntegrity('system');
            if (!systemValid) {
                issues.push('فشل التحقق من سلامة مخطط النظام');
            }

            // التحقق من مخططات المستأجرين
            // في الإصدار الحقيقي، سيتم جلب القائمة من قاعدة البيانات

            const mockTenants = ['tenant1', 'tenant2', 'tenant3'];

            for (const tenantId of mockTenants) {
                const valid = await this.tenantConnection.validateIsolationIntegrity(tenantId);
                if (!valid) {
                    issues.push(`فشل التحقق من سلامة مخطط المستأجر: ${tenantId}`);
                }
            }

            const isValid = issues.length === 0;

            if (isValid) {
                this.logger.log('[M2] ✅ نجاح التحقق من سلامة جميع المخططات');
            } else {
                this.logger.error(`[M2] ❌ مشاكل في ${issues.length} مخطط`);
            }

            return { valid: isValid, issues };

        } catch (error) {
            this.logger.error(`[M2] ❌ فشل التحقق من سلامة المخططات: ${error.message}`);
            return { valid: false, issues: [error.message] };
        }
    }
}
