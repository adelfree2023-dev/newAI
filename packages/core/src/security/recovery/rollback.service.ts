import { Injectable, Logger } from '@nestjs/common';
import { DataSnapshotService } from './data-snapshot.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RollbackService {
    private readonly logger = new Logger(RollbackService.name);

    constructor(
        private readonly snapshotService: DataSnapshotService,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService
    ) { }

    /**
     * تنفيذ استرداد للحالة السابقة
     */
    async rollbackToPreviousState(tenantId: string, operation: string): Promise<any> {
        try {
            this.logger.warn(`[M4] ⏪ بدء استرداد الحالة السابقة للمستأجر: ${tenantId}`);

            // الحصول على اللقطات الأخيرة
            const snapshots = await this.snapshotService.getSnapshotsForTenant(tenantId);

            if (snapshots.length === 0) {
                throw new Error(`No snapshots found for tenant: ${tenantId}`);
            }

            // البحث عن اللقطة السابقة للعملية المحددة
            const targetSnapshot = snapshots.find(s => s.operation === operation);

            if (!targetSnapshot) {
                throw new Error(`No snapshot found for operation: ${operation}`);
            }

            // استعادة اللقطة
            const restoredData = await this.snapshotService.restoreSnapshot(targetSnapshot.id);

            // تسجيل عملية الاسترداد
            await this.auditService.logSecurityEvent('ROLLBACK_EXECUTED', {
                tenantId,
                operation,
                snapshotId: targetSnapshot.id,
                restoredAt: new Date().toISOString(),
                success: true
            });

            this.logger.log(`[M4] ✅ تم استرداد الحالة السابقة بنجاح`);

            return {
                success: true,
                snapshotId: targetSnapshot.id,
                restoredData,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل استرداد الحالة السابقة: ${error.message}`);

            await this.auditService.logSecurityEvent('ROLLBACK_FAILURE', {
                tenantId,
                operation,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * إنشاء نقطة استرداد قبل عملية حرجة
     */
    async createRollbackPoint(tenantId: string, operation: string, data: any): Promise<string> {
        try {
            this.logger.log(`[M4] 📍 إنشاء نقطة استرداد للمستأجر: ${tenantId} - العملية: ${operation}`);

            const snapshotId = await this.snapshotService.createSnapshot(data, {
                tenantId,
                operation,
                description: `Rollback point before ${operation}`
            });

            await this.auditService.logBusinessEvent('ROLLBACK_POINT_CREATED', {
                snapshotId,
                tenantId,
                operation,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`[M4] ✅ تم إنشاء نقطة الاسترداد: ${snapshotId}`);

            return snapshotId;

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إنشاء نقطة الاسترداد: ${error.message}`);
            throw error;
        }
    }

    /**
     * التحقق من إمكانية الاسترداد
     */
    async canRollback(tenantId: string, operation: string): Promise<boolean> {
        try {
            const snapshots = await this.snapshotService.getSnapshotsForTenant(tenantId);
            return snapshots.some(s => s.operation === operation);
        } catch (error) {
            this.logger.error(`[M4] ❌ فشل التحقق من إمكانية الاسترداد: ${error.message}`);
            return false;
        }
    }

    /**
     * الحصول على سجل الاسترداد
     */
    async getRollbackHistory(tenantId: string): Promise<any[]> {
        try {
            // البحث في سجلات التدقيق عن عمليات الاسترداد
            const rollbackEvents = await this.auditService.queryAuditLogs(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // آخر 30 يوم
                new Date(),
                { eventType: 'ROLLBACK_EXECUTED', tenantId }
            );

            return rollbackEvents.map(event => ({
                timestamp: event.timestamp,
                operation: event.eventData.operation,
                snapshotId: event.eventData.snapshotId,
                success: event.eventData.success
            }));

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل الحصول على سجل الاسترداد: ${error.message}`);
            throw error;
        }
    }

    /**
     * استرداد تلقائي عند اكتشاف خطأ
     */
    async autoRollbackOnError(tenantId: string, error: any): Promise<void> {
        try {
            this.logger.error(`[M4] 🔄 بدء الاسترداد التلقائي بسبب خطأ`);

            // تحديد نوع الخطأ
            const errorType = this.classifyError(error);

            if (errorType === 'CRITICAL') {
                // محاولة استرداد من اللقطة الأخيرة
                const snapshots = await this.snapshotService.getSnapshotsForTenant(tenantId);

                if (snapshots.length > 0) {
                    const lastSnapshot = snapshots[0];
                    await this.rollbackToPreviousState(tenantId, lastSnapshot.operation);

                    this.logger.log(`[M4] ✅ تم الاسترداد التلقائي بنجاح`);
                }
            }

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل الاسترداد التلقائي: ${error.message}`);
        }
    }

    /**
     * تصنيف الخطأ
     */
    private classifyError(error: any): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
        const criticalKeywords = ['database', 'connection', 'corruption', 'encryption'];
        const highKeywords = ['validation', 'authorization', 'permission'];

        const errorMessage = error.message.toLowerCase();

        if (criticalKeywords.some(kw => errorMessage.includes(kw))) {
            return 'CRITICAL';
        }

        if (highKeywords.some(kw => errorMessage.includes(kw))) {
            return 'HIGH';
        }

        return 'MEDIUM';
    }
}
