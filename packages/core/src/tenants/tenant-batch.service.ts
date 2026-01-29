import { Injectable, Logger } from '@nestjs/common';
import { TenantService } from './tenant.service';
// import { AuditService } from '../security/layers/s4-audit-logging/audit.service'; // سيتم تفعيلها لاحقاً لضمان عدم وجود دائرة تبعية

@Injectable()
export class TenantBatchService {
    private readonly logger = new Logger(TenantBatchService.name);

    constructor(
        private readonly tenantService: TenantService,
        // private readonly auditService: AuditService
    ) { }

    /**
     * دالة لإنشاء مجموعة من المستأجرين على دفعات
     * Batch Creation Method
     */
    async createTenantsBatch(tenantsData: any[], batchSize: number = 50): Promise<any> {
        const results = {
            total: tenantsData.length,
            successful: 0,
            failed: 0,
            errors: [] as any[],
            startTime: new Date().toISOString(),
            endTime: null
        };

        this.logger.log(`🏗️ بدء إنشاء ${tenantsData.length} مستأجر على دفعات...`);

        // تقسيم البيانات إلى دفعات (Chunking)
        const batches = [];
        for (let i = 0; i < tenantsData.length; i += batchSize) {
            batches.push(tenantsData.slice(i, i + batchSize));
        }

        // معالجة كل دفعة (Processing each batch)
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            this.logger.log(`📦 معالجة الدفعة ${batchIndex + 1}/${batches.length} (${batch.length} مستأجر)`);

            // استخدام Promise.allSettled لضمان استمرار العملية حتى لو فشل بعضها
            const batchPromises = batch.map(tenantData =>
                this.createTenantWithRetry(tenantData, 3)
            );

            const batchResults = await Promise.allSettled(batchPromises);

            // تحديث النتائج
            batchResults.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    results.successful++;
                } else {
                    results.failed++;
                    results.errors.push({
                        tenantId: batch[index].id,
                        error: result.reason.message,
                        stack: result.reason.stack
                    });
                }
            });

            // تسجيل تقدم العملية
            this.logger.log(`✅ الدفعة ${batchIndex + 1}: ${results.successful} نجاح، ${results.failed} فشل`);

            // تأخير بين الدفعات (2 ثانية) لتخفيف الحمل على قاعدة البيانات
            if (batchIndex < batches.length - 1) {
                await this.delay(2000);
            }
        }

        results.endTime = new Date().toISOString();

        // تسجيل الحدث (سيتم تفعيله لاحقاً)
        /*
        await this.auditService.logBusinessEvent('TENANTS_BATCH_CREATION', {
          total: results.total,
          successful: results.successful,
          failed: results.failed,
          startTime: results.startTime,
          endTime: results.endTime,
          timestamp: new Date().toISOString()
        });
        */

        this.logger.log(`🎉 اكتمل إنشاء المستأجرين: ${results.successful}/${results.total} نجاح`);

        return results;
    }

    /**
     * محاولة الإنشاء مع إعادة المحاولة في حالة الفشل
     * Retry Logic
     */
    private async createTenantWithRetry(tenantData: any, maxRetries: number): Promise<any> {
        let lastError: Error;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.tenantService.createTenant(tenantData);
            } catch (error) {
                lastError = error;

                // إذا كان خطأ تحديد معدل (Rate Limit)، انتظر وحاول مرة أخرى
                if (error.message.includes('RATE_LIMIT') && attempt < maxRetries) {
                    this.logger.warn(`⏳ محاولة ${attempt}/${maxRetries} فشلت بسبب تحديد المعدل. انتظار 3 ثوانٍ...`);
                    await this.delay(3000);
                    continue;
                }

                // أي خطأ آخر، أعد رميه ليتم تسجيله في النتائج النهائية
                throw error;
            }
        }

        throw lastError;
    }

    // دالة مساعدة للتأخير (Delay Helper)
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
