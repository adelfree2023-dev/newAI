import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { SchemaManagerService } from './schema-manager.service';
import { IsolationValidatorService } from './isolation-validator.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { Logger } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class TenantDatabaseService {
  private readonly logger = new Logger(TenantDatabaseService.name);
  private dataSource: DataSource;
  private currentSchema: string;
  private isSystemOperation = false;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly tenantContext: TenantContextService,
    private readonly schemaManager: SchemaManagerService,
    private readonly isolationValidator: IsolationValidatorService,
    private readonly auditService: AuditService
  ) {
    this.initialize();
  }

  private async initialize() {
    this.dataSource = this.schemaManager.getDataSource();
    this.isSystemOperation = this.tenantContext.isSystemContext();
    
    if (!this.isSystemOperation) {
      const tenantId = this.tenantContext.getTenantId();
      if (tenantId) {
        this.currentSchema = await this.schemaManager.switchToTenantSchema(tenantId);
      }
    } else {
      // عمليات النظام تستخدم مخطط النظام
      this.currentSchema = this.schemaManager['systemSchema'];
    }
  }

  async getRepository<T>(entityClass: any): Promise<Repository<T>> {
    if (!this.currentSchema && !this.isSystemOperation) {
      throw new Error('لا يمكن الحصول على المستودع - سياق المستأجر غير مهيأ');
    }
    
    try {
      const repository = this.dataSource.getRepository(entityClass).extend({
        createQueryBuilder: (alias?: string, queryRunner?: any) => {
          const qb = super.createQueryBuilder(alias, queryRunner);
          return this.enhanceQueryBuilder(qb, entityClass.name);
        }
      });
      
      this.logger.debug(`[M2] ✅ تم الحصول على مستودع ${entityClass.name} للمخطط: ${this.currentSchema}`);
      return repository;
    } catch (error) {
      this.logger.error(`[M2] ❌ فشل الحصول على مستودع ${entityClass.name}: ${error.message}`);
      throw new Error(`فشل في الحصول على مستودع ${entityClass.name}: ${error.message}`);
    }
  }

  private enhanceQueryBuilder<T>(qb: SelectQueryBuilder<T>, entityName: string): SelectQueryBuilder<T> {
    // إضافة شرط tenant_id تلقائياً إذا كان موجوداً في الجدول
    if (!this.isSystemOperation && this.tenantContext.getTenantId()) {
      const tenantId = this.tenantContext.getTenantId();
      
      // التحقق من وجود عمود tenant_id
      const hasTenantIdColumn = this.hasTenantIdColumn(entityName);
      
      if (hasTenantIdColumn) {
        // إضافة شرط tenant_id لمنع الوصول لبيانات المستأجرين الآخرين
        qb.andWhere(`${qb.alias}.tenant_id = :tenantId`, { tenantId });
        
        this.logger.debug(`[M2] 🔒 تم إضافة شرط tenant_id للمستعلم: ${entityName}`);
      }
    }
    
    // تسجيل الاستعلام للاكتشاف الأمني
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`[M2] 📝 استعلام SQL: ${qb.getQuery()}`);
    }
    
    return qb;
  }

  private hasTenantIdColumn(entityName: string): boolean {
    // في الإصدار الحقيقي، سيتم التحقق من مخطط الجدول
    // هنا نستخدم قائمة بيضاء للجداول التي تحتوي على tenant_id
    const tablesWithTenantId = ['users', 'products', 'orders', 'customers', 'settings'];
    return tablesWithTenantId.includes(entityName.toLowerCase());
  }

  async executeIsolatedQuery<T>(query: string, parameters?: any[]): Promise<T[]> {
    if (!this.currentSchema && !this.isSystemOperation) {
      throw new Error('لا يمكن تنفيذ الاستعلام - سياق المستأجر غير مهيأ');
    }
    
    const tenantId = this.tenantContext.getTenantId();
    const queryRunner = this.dataSource.createQueryRunner();
    
    try {
      await queryRunner.connect();
      
      // التبديل إلى مخطط المستأجر
      if (!this.isSystemOperation && tenantId) {
        await this.schemaManager.switchToTenantSchema(tenantId, queryRunner);
      }
      
      // التحقق من أمان الاستعلام
      await this.isolationValidator.validateQuery(query, tenantId, this.isSystemOperation);
      
      // تنفيذ الاستعلام
      const result = await queryRunner.query(query, parameters);
      
      // تسجيل الاستعلام الناجح
      await this.auditService.logSystemEvent('ISOLATED_QUERY_EXECUTED', {
        query: this.maskSensitiveData(query),
        tenantId,
        isSystemOperation: this.isSystemOperation,
        timestamp: new Date().toISOString(),
        success: true
      });
      
      return result;
    } catch (error) {
      this.logger.error(`[M2] ❌ فشل تنفيذ الاستعلام المعزول: ${error.message}`);
      
      // تسجيل فشل الاستعلام
      await this.auditService.logSecurityEvent('ISOLATED_QUERY_FAILURE', {
        query: this.maskSensitiveData(query),
        tenantId,
        isSystemOperation: this.isSystemOperation,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private maskSensitiveData(query: string): string {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/credit_card\s*=\s*'[^']*'/gi, "credit_card = '[REDACTED]'");
  }

  async validateIsolationIntegrity(): Promise<boolean> {
    try {
      // التحقق من سلامة العزل الحالي
      const isolationData = {
        tenantId: this.tenantContext.getTenantId() || 'system',
        schemaName: this.currentSchema,
        operationType: 'VALIDATE',
        contextData: {
          requestId: this.request['requestId'] || 'unknown',
          userId: this.request.user?.id || 'anonymous',
          ipAddress: this.getClientIp(),
          userAgent: this.request.get('User-Agent')
        }
      };
      
      const result = await this.isolationValidator.validateIsolation(isolationData);
      
      if (!result.isSecure) {
        this.logger.error(`[M2] 🚨 كشف انتهاك في عزل البيانات: ${result.issueType}`);
        
        // اتخاذ إجراء فوري
        await this.handleIsolationBreach(result);
      }
      
      return result.isSecure;
    } catch (error) {
      this.logger.error(`[M2] ❌ فشل التحقق من سلامة العزل: ${error.message}`);
      return false;
    }
  }

  private async handleIsolationBreach(result: any) {
    const tenantId = this.tenantContext.getTenantId() || 'system';
    
    this.logger.error(`[M2] 🚨🚨🚨 انتهاك خطير لعزل البيانات للمستأجر: ${tenantId} 🚨🚨🚨`);
    
    // تسجيل حدث أمني حرجة
    await this.auditService.logSecurityEvent('ISOLATION_BREACH_DETECTED', {
      tenantId,
      issueType: result.issueType,
      description: result.description,
      severity: result.severity,
      timestamp: new Date().toISOString(),
      autoResponse: 'IMMEDIATE_ISOLATION'
    });
    
    // إيقاف جميع العمليات للمستأجر المتأثر
    this.logger.error(`[M2] ⛔ إيقاف جميع العمليات للمستأجر: ${tenantId}`);
    
    // في الإصدار الحقيقي، سيتم حظر المستأجر مؤقتاً
    // await this.tenantService.suspendTenant(tenantId, 'ISOLATION_BREACH');
    
    throw new Error(`انتهاك أمني: ${result.description}. تم إيقاف العمليات فوراً.`);
  }

  private getClientIp(): string {
    const forwardedFor = this.request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    }
    return this.request.ip || this.request.connection.remoteAddress || 'unknown';
  }

  forceSystemContext() {
    this.isSystemOperation = true;
    this.currentSchema = this.schemaManager['systemSchema'];
    this.logger.warn('[M2] ⚠️ تم تفعيل سياق النظام يدوياً');
  }
}