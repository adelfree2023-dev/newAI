import { Injectable, Logger } from '@nestjs/common';
import { SchemaManagerService } from './database/schema-manager.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private activeTenants: Map<string, any> = new Map();

  constructor(
    private readonly schemaManager: SchemaManagerService,
    private readonly auditService: AuditService
  ) {}

  async createTenant(tenantData: any): Promise<any> {
    this.logger.log(`🏗️ [M2] إنشاء مستأجر جديد: ${tenantData.name}`);
    
    try {
      // 1. التحقق من صحة البيانات
      this.validateTenantData(tenantData);
      
      // 2. إنشاء مخطط قاعدة البيانات
      const schemaResult = await this.schemaManager.createTenantSchema(tenantData.id, tenantData.name);
      
      if (!schemaResult.success) {
        throw new Error(`فشل إنشاء مخطط المستأجر: ${schemaResult.schemaName}`);
      }
      
      // 3. تسجيل الحدث
      await this.auditService.logBusinessEvent('TENANT_CREATED', {
        tenantId: tenantData.id,
        tenantName: tenantData.name,
        schemaName: schemaResult.schemaName,
        timestamp: new Date().toISOString()
      });
      
      // 4. تحميل المستأجر إلى الذاكرة
      this.activeTenants.set(tenantData.id, {
        ...tenantData,
        schemaName: schemaResult.schemaName,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
      });
      
      this.logger.log(`✅ [M2] تم إنشاء المستأجر بنجاح: ${tenantData.name} (${tenantData.id})`);
      return { 
        ...tenantData, 
        schemaName: schemaResult.schemaName,
        status: 'ACTIVE'
      };
      
    } catch (error) {
      this.logger.error(`❌ [M2] فشل إنشاء المستأجر: ${error.message}`);
      
      // تسجيل حدث أمني
      await this.auditService.logSecurityEvent('TENANT_CREATION_FAILURE', {
        tenantName: tenantData.name,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  private validateTenantData(tenantData: any) {
    // التحقق من الحقول المطلوبة
    const requiredFields = ['id', 'name', 'domain', 'businessType', 'contactEmail'];
    
    for (const field of requiredFields) {
      if (!tenantData[field] || tenantData[field].trim() === '') {
        throw new Error(`الحقل مطلوب: ${field}`);
      }
    }
    
    // التحقق من تنسيق البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantData.contactEmail)) {
      throw new Error('تنسيق البريد الإلكتروني غير صالح');
    }
    
    // التحقق من طول النطاق
    if (tenantData.domain.length < 3 || tenantData.domain.length > 50) {
      throw new Error('طول النطاق يجب أن يكون بين 3 و 50 حرفاً');
    }
  }

  async loadActiveTenants() {
    this.logger.log('[M2] 📥 تحميل المستأجرين النشطين من قاعدة البيانات...');
    
    try {
      // في الإصدار الحقيقي، سيتم جلب هذه البيانات من قاعدة البيانات
      // هنا نستخدم بيانات محاكاة
      const mockTenants = [
        { id: 'tenant1', name: 'متجر الإلكتروني الأول', domain: 'store1', businessType: 'RETAIL', contactEmail: 'admin@store1.com', status: 'ACTIVE' },
        { id: 'tenant2', name: 'العيادة الطبية', domain: 'clinic', businessType: 'HEALTHCARE', contactEmail: 'admin@clinic.com', status: 'ACTIVE' },
        { id: 'tenant3', name: 'مطعم سريع', domain: 'restaurant', businessType: 'RESTAURANT', contactEmail: 'admin@restaurant.com', status: 'ACTIVE' }
      ];
      
      for (const tenant of mockTenants) {
        try {
          // محاولة إنشاء المخطط إذا لم يكن موجوداً
          const schemaResult = await this.schemaManager.createTenantSchema(tenant.id, tenant.name);
          
          this.activeTenants.set(tenant.id, {
            ...tenant,
            schemaName: schemaResult.schemaName,
            loadedAt: new Date().toISOString()
          });
          
          this.logger.log(`✅ [M2] تم تحميل المستأجر: ${tenant.name}`);
        } catch (error) {
          this.logger.error(`❌ [M2] فشل تحميل المستأجر ${tenant.name}: ${error.message}`);
        }
      }
      
      this.logger.log(`✅ [M2] تم تحميل ${this.activeTenants.size} مستأجرين نشطين`);
      
      // تسجيل الحدث
      await this.auditService.logSystemEvent('TENANTS_LOADED', {
        count: this.activeTenants.size,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.logger.error(`❌ [M2] فشل تحميل المستأجرين: ${error.message}`);
      
      // في حالة الفشل، محاولة الاسترداد
      this.logger.warn('[M2] ⚠️ سيتم العمل مع المستأجرين الموجودين في الذاكرة فقط');
    }
  }

  getActiveTenant(tenantId: string): any | null {
    return this.activeTenants.get(tenantId) || null;
  }

  getAllActiveTenants(): any[] {
    return Array.from(this.activeTenants.values());
  }

  async suspendTenant(tenantId: string, reason: string): Promise<boolean> {
    const tenant = this.activeTenants.get(tenantId);
    
    if (!tenant) {
      this.logger.warn(`[M2] ⚠️ محاولة تعليق مستأجر غير موجود: ${tenantId}`);
      return false;
    }
    
    try {
      this.logger.warn(`[M2] ⚠️ تعليق المستأجر: ${tenantId} - السبب: ${reason}`);
      
      // 1. تحديث حالة المستأجر
      tenant.status = 'SUSPENDED';
      tenant.suspendedAt = new Date().toISOString();
      tenant.suspensionReason = reason;
      
      // 2. تسجيل الحدث
      await this.auditService.logSecurityEvent('TENANT_SUSPENDED', {
        tenantId,
        tenantName: tenant.name,
        reason,
        timestamp: new Date().toISOString(),
        suspendedBy: 'system'
      });
      
      // 3. تنفيذ إجراءات التعليق (في الإصدار الحقيقي)
      // - إيقاف جميع العمليات للمستأجر
      // - إرسال إشعار للمستخدمين
      // - حفظ حالة المستأجر
      
      this.logger.log(`✅ [M2] تم تعليق المستأجر بنجاح: ${tenantId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`❌ [M2] فشل تعليق المستأجر: ${error.message}`);
      
      // محاولة الاسترداد
      tenant.status = 'ACTIVE';
      delete tenant.suspendedAt;
      delete tenant.suspensionReason;
      
      return false;
    }
  }

  async activateTenant(tenantId: string): Promise<boolean> {
    const tenant = this.activeTenants.get(tenantId);
    
    if (!tenant) {
      this.logger.warn(`[M2] ⚠️ محاولة تفعيل مستأجر غير موجود: ${tenantId}`);
      return false;
    }
    
    if (tenant.status === 'ACTIVE') {
      this.logger.debug(`[M2] ⚠️ المستأجر مفعل مسبقاً: ${tenantId}`);
      return true;
    }
    
    try {
      this.logger.log(`[M2] ✅ تفعيل المستأجر: ${tenantId}`);
      
      // 1. تحديث حالة المستأجر
      tenant.status = 'ACTIVE';
      delete tenant.suspendedAt;
      delete tenant.suspensionReason;
      
      // 2. تسجيل الحدث
      await this.auditService.logBusinessEvent('TENANT_ACTIVATED', {
        tenantId,
        tenantName: tenant.name,
        timestamp: new Date().toISOString(),
        activatedBy: 'system'
      });
      
      // 3. استئناف العمليات (في الإصدار الحقيقي)
      
      this.logger.log(`✅ [M2] تم تفعيل المستأجر بنجاح: ${tenantId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`❌ [M2] فشل تفعيل المستأجر: ${error.message}`);
      
      // محاولة الاسترداد
      tenant.status = 'SUSPENDED';
      
      return false;
    }
  }
}