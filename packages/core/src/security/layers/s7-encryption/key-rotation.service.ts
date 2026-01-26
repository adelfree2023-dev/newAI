import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);
  private rotationSchedule: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) {
    this.initializeKeyRotation();
  }

  private initializeKeyRotation() {
    try {
      const autoRotationEnabled = this.configService.get<boolean>('AUTO_KEY_ROTATION_ENABLED', false);
      
      if (autoRotationEnabled) {
        this.logger.log('🔄 [S7] تهيئة تدوير المفاتيح التلقائي...');
        
        // تدوير مفاتيح المستأجرين كل 30 يوماً
        const tenantRotationDays = this.configService.get<number>('TENANT_KEY_ROTATION_DAYS', 30);
        this.scheduleRotation('tenants', tenantRotationDays);
        
        // تدوير المفاتيح العامة كل 90 يوماً
        const systemRotationDays = this.configService.get<number>('SYSTEM_KEY_ROTATION_DAYS', 90);
        this.scheduleRotation('system', systemRotationDays);
        
        this.logger.log('✅ [S7] تم تهيئة تدوير المفاتيح التلقائي');
      } else {
        this.logger.warn('⚠️ [S7] تدوير المفاتيح التلقائي معطل');
      }
    } catch (error) {
      this.logger.error(`❌ [S7] فشل تهيئة تدوير المفاتيح: ${error.message}`);
    }
  }

  private scheduleRotation(type: string, days: number) {
    const intervalMs = days * 24 * 60 * 60 * 1000;
    
    // إلغاء الجدولة القديمة إذا وجدت
    if (this.rotationSchedule.has(type)) {
      clearInterval(this.rotationSchedule.get(type));
    }
    
    // جدولة التدوير الدوري
    const rotationInterval = setInterval(async () => {
      await this.performScheduledRotation(type);
    }, intervalMs);
    
    // تنفيذ التدوير الأولي بعد 5 دقائق
    setTimeout(async () => {
      await this.performScheduledRotation(type);
    }, 5 * 60 * 1000);
    
    this.rotationSchedule.set(type, rotationInterval);
    this.logger.log(`✅ [S7] تم جدولة تدوير المفاتيح لنوع "${type}" كل ${days} يوم`);
  }

  private async performScheduledRotation(type: string) {
    try {
      this.logger.log(`🔄 [S7] بدء تدوير المفاتيح المجدول للنوع: ${type}`);
      
      // تدوير مفاتيح المستأجرين
      if (type === 'tenants') {
        await this.rotateTenantKeys();
      } 
      // تدوير المفاتيح العامة
      else if (type === 'system') {
        await this.rotateSystemKeys();
      }
      
      this.logger.log(`✅ [S7] اكتمل تدوير المفاتيح للنوع: ${type}`);
    } catch (error) {
      this.logger.error(`❌ [S7] فشل تدوير المفاتيح للنوع ${type}: ${error.message}`);
      
      // تسجيل حدث أمني
      this.auditService.logSecurityEvent('SCHEDULED_ROTATION_FAILURE', {
        type,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async rotateTenantKeys() {
    try {
      // في الإصدار الحقيقي، سيتم جلب قائمة المستأجرين من قاعدة البيانات
      const tenants = ['tenant1', 'tenant2', 'tenant3']; // مؤقت
      
      this.logger.log(`🔄 [S7] بدء تدوير مفاتيح ${tenants.length} مستأجر`);
      
      for (const tenantId of tenants) {
        this.logger.log(`🔄 [S7] تدوير مفاتيح المستأجر: ${tenantId}`);
        
        // تدوير المفاتيح
        const success = await this.encryptionService.rotateKeys(tenantId);
        
        if (success) {
          this.logger.log(`✅ [S7] تم تدوير مفاتيح المستأجر: ${tenantId} بنجاح`);
          
          // إرسال إشعار للمستأجر (سيتم تنفيذه لاحقاً)
          // await this.notifyTenant(tenantId, 'KEY_ROTATION_COMPLETED');
        } else {
          this.logger.error(`❌ [S7] فشل تدوير مفاتيح المستأجر: ${tenantId}`);
        }
      }
      
      this.logger.log(`✅ [S7] اكتمل تدوير مفاتيح جميع المستأجرين`);
    } catch (error) {
      this.logger.error(`❌ [S7] خطأ في تدوير مفاتيح المستأجرين: ${error.message}`);
      throw error;
    }
  }

  private async rotateSystemKeys() {
    try {
      this.logger.log(`🔄 [S7] بدء تدوير المفاتيح العامة`);
      
      // تدوير مفاتيح النظام المختلفة
      const systemContexts = ['database', 'cache', 'communication', 'files'];
      
      for (const context of systemContexts) {
        this.logger.log(`🔄 [S7] تدوير مفتاح النظام للسياق: ${context}`);
        
        // استخدام tenantId خاص بالنظام
        const success = await this.encryptionService.rotateKeys('system', context);
        
        if (success) {
          this.logger.log(`✅ [S7] تم تدوير مفتاح النظام للسياق: ${context} بنجاح`);
        } else {
          this.logger.error(`❌ [S7] فشل تدوير مفتاح النظام للسياق: ${context}`);
        }
      }
      
      this.logger.log(`✅ [S7] اكتمل تدوير جميع مفاتيح النظام`);
    } catch (error) {
      this.logger.error(`❌ [S7] خطأ في تدوير مفاتيح النظام: ${error.message}`);
      throw error;
    }
  }

  async rotateSpecificTenantKeys(tenantId: string): Promise<boolean> {
    try {
      this.logger.log(`🔄 [S7] تدوير يدوي لمفاتيح المستأجر: ${tenantId}`);
      
      const success = await this.encryptionService.rotateKeys(tenantId);
      
      if (success) {
        this.logger.log(`✅ [S7] تم تدوير مفاتيح المستأجر: ${tenantId} بنجاح`);
        
        // تسجيل الحدث
        this.auditService.logSecurityEvent('MANUAL_KEY_ROTATION', {
          tenantId,
          timestamp: new Date().toISOString(),
          success: true,
          triggeredBy: this.tenantContext.getTenantId() || 'system'
        });
        
        return true;
      } else {
        this.logger.error(`❌ [S7] فشل تدوير مفاتيح المستأجر: ${tenantId}`);
        
        this.auditService.logSecurityEvent('MANUAL_KEY_ROTATION_FAILURE', {
          tenantId,
          timestamp: new Date().toISOString(),
          success: false
        });
        
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ [S7] خطأ في تدوير مفاتيح المستأجر: ${tenantId} - ${error.message}`);
      
      this.auditService.logSecurityEvent('MANUAL_KEY_ROTATION_ERROR', {
        tenantId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  async rotateSystemContextKeys(context: string): Promise<boolean> {
    try {
      this.logger.log(`🔄 [S7] تدوير يدوي لمفتاح النظام للسياق: ${context}`);
      
      const success = await this.encryptionService.rotateKeys('system', context);
      
      if (success) {
        this.logger.log(`✅ [S7] تم تدوير مفتاح النظام للسياق: ${context} بنجاح`);
        
        this.auditService.logSecurityEvent('MANUAL_SYSTEM_KEY_ROTATION', {
          context,
          timestamp: new Date().toISOString(),
          success: true,
          triggeredBy: this.tenantContext.getTenantId() || 'system'
        });
        
        return true;
      } else {
        this.logger.error(`❌ [S7] فشل تدوير مفتاح النظام للسياق: ${context}`);
        
        this.auditService.logSecurityEvent('MANUAL_SYSTEM_KEY_ROTATION_FAILURE', {
          context,
          timestamp: new Date().toISOString(),
          success: false
        });
        
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ [S7] خطأ في تدوير مفتاح النظام للسياق: ${context} - ${error.message}`);
      
      this.auditService.logSecurityEvent('MANUAL_SYSTEM_KEY_ROTATION_ERROR', {
        context,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  async getKeyRotationHistory(tenantId?: string, limit: number = 10): Promise<any[]> {
    try {
      // في الإصدار الحقيقي، سيتم جلب هذه البيانات من قاعدة البيانات
      // هنا نعيد بيانات محاكاة
      const history = [
        {
          tenantId: tenantId || 'system',
          context: 'users',
          rotationDate: new Date().toISOString(),
          rotatedBy: 'system_scheduler',
          success: true
        },
        {
          tenantId: tenantId || 'system',
          context: 'payments',
          rotationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          rotatedBy: 'manual_request',
          success: true
        }
      ].slice(0, limit);
      
      return history;
    } catch (error) {
      this.logger.error(`❌ [S7] خطأ في الحصول على سجل تدوير المفاتيح: ${error.message}`);
      return [];
    }
  }

  async emergencyKeyRotation(): Promise<boolean> {
    try {
      this.logger.warn(`🚨 [S7] بدء تدوير طوارئ للمفاتيح بسبب اكتشاف تهديد`);
      
      // إيقاف التدوير المجدول الحالي
      this.stopAllScheduledRotations();
      
      // تدوير جميع المفاتيح
      let success = true;
      
      // تدوير مفاتيح المستأجرين
      const tenants = ['tenant1', 'tenant2', 'tenant3']; // في الإصدار الحقيقي، يتم جلبها من قاعدة البيانات
      for (const tenantId of tenants) {
        const tenantSuccess = await this.encryptionService.rotateKeys(tenantId);
        if (!tenantSuccess) success = false;
      }
      
      // تدوير مفاتيح النظام
      const systemContexts = ['database', 'cache', 'communication', 'files'];
      for (const context of systemContexts) {
        const systemSuccess = await this.encryptionService.rotateKeys('system', context);
        if (!systemSuccess) success = false;
      }
      
      // إعادة تشغيل التدوير المجدول
      this.initializeKeyRotation();
      
      // تسجيل الحدث
      this.auditService.logSecurityEvent('EMERGENCY_KEY_ROTATION', {
        timestamp: new Date().toISOString(),
        triggeredBy: this.tenantContext.getTenantId() || 'system',
        success,
        tenantCount: tenants.length,
        systemContexts: systemContexts.length
      });
      
      return success;
    } catch (error) {
      this.logger.error(`❌ [S7] خطأ في تدوير طوارئ للمفاتيح: ${error.message}`);
      
      this.auditService.logSecurityEvent('EMERGENCY_KEY_ROTATION_FAILURE', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  private stopAllScheduledRotations() {
    this.rotationSchedule.forEach((interval, type) => {
      clearInterval(interval);
    });
    this.rotationSchedule.clear();
    this.logger.log('✅ [S7] تم إيقاف جميع جداول تدوير المفاتيح');
  }

  onModuleDestroy() {
    this.stopAllScheduledRotations();
  }
}