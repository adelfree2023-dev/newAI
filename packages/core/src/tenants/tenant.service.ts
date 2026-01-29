import { Injectable, Logger, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { TenantConnectionService } from './database/tenant-connection.service';
import { SchemaInitializerService } from './database/schema-initializer.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);
  private activeTenants: Map<string, any> = new Map<string, any>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantConnection: TenantConnectionService,
    private readonly schemaInitializer: SchemaInitializerService,
    private readonly auditService: AuditService
  ) { }

  async createTenant(tenantData: any): Promise<any> {
    this.logger.log(`🏗️ [M2] إنشاء مستأجر جديد: ${tenantData.name}`);

    try {
      // 1. التحقق من صحة البيانات
      this.validateTenantData(tenantData);

      // 2. إنشاء وتهيئة مخطط قاعدة البيانات
      await this.schemaInitializer.initializeNewTenant(tenantData.id, tenantData.name);

      const schemaName = this.tenantConnection.getSchemaName(tenantData.id);

      // 3. تسجيل الحدث
      await this.auditService.logBusinessEvent('TENANT_CREATED', {
        tenantId: tenantData.id,
        tenantName: tenantData.name,
        schemaName: schemaName,
        timestamp: new Date().toISOString()
      });

      // 4. حفظ المستأجر في قاعدة البيانات باستخدام Prisma
      const tenant = await this.prisma.tenant.create({
        data: {
          id: tenantData.id,
          name: tenantData.name,
          domain: tenantData.domain,
          businessType: tenantData.businessType,
          contactEmail: tenantData.contactEmail,
          status: 'ACTIVE',
          schemaName: schemaName
        }
      });

      // 5. تحميل المستأجر إلى الذاكرة
      this.activeTenants.set(tenant.id, tenant);

      this.logger.log(`✅ [M2] تم إنشاء المستأجر بنجاح: ${tenant.name} (${tenant.id})`);
      return tenant;

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
    const requiredFields = ['id', 'name', 'domain', 'businessType', 'contactEmail'];

    for (const field of requiredFields) {
      if (!tenantData[field] || tenantData[field].trim() === '') {
        throw new Error(`الحقل مطلوب: ${field}`);
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantData.contactEmail)) {
      throw new Error('تنسيق البريد الإلكتروني غير صالح');
    }

    if (tenantData.domain.length < 3 || tenantData.domain.length > 50) {
      throw new Error('طول النطاق يجب أن يكون بين 3 و 50 حرفاً');
    }
  }

  async loadActiveTenants() {
    this.logger.log('[M2] 📥 تحميل المستأجرين النشطين من قاعدة البيانات...');

    try {
      const tenants = await this.prisma.tenant.findMany({ where: { status: 'ACTIVE' } });

      for (const tenant of tenants) {
        try {
          await this.schemaInitializer.initializeNewTenant(tenant.id, tenant.name);
          const schemaName = this.tenantConnection.getSchemaName(tenant.id);

          this.activeTenants.set(tenant.id, {
            ...tenant,
            schemaName: schemaName,
            loadedAt: new Date().toISOString()
          });

          this.logger.log(`✅ [M2] تم تحميل المستأجر من قاعدة البيانات: ${tenant.name}`);
        } catch (error) {
          this.logger.error(`❌ [M2] فشل تحميل المستأجر ${tenant.name}: ${error.message}`);
        }
      }

      this.logger.log(`✅ [M2] تم تحميل ${this.activeTenants.size} مستأجرين نشطين من قاعدة البيانات`);

      await this.auditService.logSystemEvent('TENANTS_LOADED', {
        count: this.activeTenants.size,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.logger.error(`❌ [M2] فشل تحميل المستأجرين: ${error.message}`);
      this.logger.warn('[M2] ⚠️ سيتم العمل مع المستأجرين الموجودين في الذاكرة فقط');
    }
  }

  getActiveTenant(tenantId: string): any | null {
    return this.activeTenants.get(tenantId) || null;
  }

  getAllActiveTenants(): any[] {
    if (!this.activeTenants) {
      this.activeTenants = new Map<string, any>();
    }
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

      // 1. تحديث قاعدة البيانات
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'SUSPENDED' }
      });

      // 2. تحديث الذاكرة
      tenant.status = 'SUSPENDED';

      // 3. تسجيل الحدث
      await this.auditService.logSecurityEvent('TENANT_SUSPENDED', {
        tenantId,
        tenantName: tenant.name,
        reason,
        timestamp: new Date().toISOString(),
        suspendedBy: 'system'
      });

      this.logger.log(`✅ [M2] تم تعليق المستأجر بنجاح: ${tenantId}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ [M2] فشل تعليق المستأجر: ${error.message}`);
      return false;
    }
  }

  async activateTenant(tenantId: string): Promise<boolean> {
    const tenant = this.activeTenants.get(tenantId);

    if (!tenant) {
      this.logger.warn(`[M2] ⚠️ محاولة تفعيل مستأجر غير موجود: ${tenantId}`);
      return false;
    }

    try {
      this.logger.log(`[M2] ✅ تفعيل المستأجر: ${tenantId}`);

      // 1. تحديث قاعدة البيانات
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { status: 'ACTIVE' }
      });

      // 2. تحديث الذاكرة
      tenant.status = 'ACTIVE';

      // 3. تسجيل الحدث
      await this.auditService.logBusinessEvent('TENANT_ACTIVATED', {
        tenantId,
        tenantName: tenant.name,
        timestamp: new Date().toISOString(),
        activatedBy: 'system'
      });

      this.logger.log(`✅ [M2] تم تفعيل المستأجر بنجاح: ${tenantId}`);
      return true;

    } catch (error) {
      this.logger.error(`❌ [M2] فشل تفعيل المستأجر: ${error.message}`);
      return false;
    }
  }

  async createTenantWithStore(dto: any) {
    this.logger.log(`🚀 [M2] بدء عملية إنشاء المستأجر مع المتجر: ${dto.storeName}`);

    try {
      const existing = await this.prisma.tenant.findFirst({
        where: { domain: dto.subdomain }
      });
      if (existing) throw new ConflictException('المتجر موجود بالفعل');

      const tenant = await this.prisma.tenant.create({
        data: {
          id: `t-${Date.now()}`,
          name: dto.storeName,
          domain: dto.subdomain,
          businessType: dto.businessType,
          contactEmail: dto.email,
          status: 'PROVISIONING',
          schemaName: `tenant_${dto.subdomain}`
        }
      });

      await this.schemaInitializer.initializeNewTenant(tenant.id, tenant.name);

      const updatedTenant = await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'ACTIVE' }
      });
      this.activeTenants.set(updatedTenant.id, updatedTenant);

      return {
        ...updatedTenant,
        subdomain: (updatedTenant as any).subdomain || (updatedTenant as any).domain || dto.subdomain,
        storeUrl: `https://${dto.subdomain}.apex-platform.com`
      };
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      this.logger.error(`❌ [M2] فشل إنشاء المستأجر المتكامل: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }
}
