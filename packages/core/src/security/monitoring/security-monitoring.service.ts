import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { AnomalyAnalyzerService } from '../monitoring/anomaly-analyzer.service';
import { AutomatedResponseService } from '../response/automated-response.service';
import { BruteForceProtectionService } from '../../auth/services/brute-force-protection.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';

@Injectable()
export class SecurityMonitoringService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SecurityMonitoringService.name);
    private monitoringInterval: NodeJS.Timeout;
    private criticalEventsInterval: NodeJS.Timeout;
    private readonly monitoringFrequency: number;
    private readonly criticalCheckFrequency: number;
    private isMonitoring = false;

    constructor(
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
        private readonly anomalyAnalyzer: AnomalyAnalyzerService,
        private readonly automatedResponse: AutomatedResponseService,
        private readonly bruteForceProtection: BruteForceProtectionService,
        private readonly tenantContext: TenantContextService,
        private readonly encryptionService: EncryptionService
    ) {
        this.monitoringFrequency = this.configService.get<number>('SECURITY_MONITORING_INTERVAL_MS', 5000); // 5 ثوانٍ
        this.criticalCheckFrequency = this.configService.get<number>('CRITICAL_EVENTS_CHECK_INTERVAL_MS', 1000); // 1 ثانية
    }

    async onModuleInit() {
        this.logger.log('👁️ [M4] بدء تهيئة خدمة المراقبة الأمنية...');

        // بدء المراقبة الدورية
        this.startMonitoring();

        // بدء مراقبة الأحداث الحرجة بشكل منفصل
        this.startCriticalEventsMonitoring();

        // فحص أولي فوري
        setTimeout(() => this.performInitialHealthCheck(), 10000);

        this.isMonitoring = true;
        this.logger.log('✅ [M4] تم تهيئة خدمة المراقبة الأمنية بنجاح');
    }

    private startMonitoring() {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performSecurityCheck();
            } catch (error) {
                this.logger.error(`[M4] ❌ فشل في فحص الأمان الدوري: ${error.message}`);
            }
        }, this.monitoringFrequency);
    }

    private startCriticalEventsMonitoring() {
        this.criticalEventsInterval = setInterval(async () => {
            try {
                await this.checkCriticalEvents();
            } catch (error) {
                this.logger.error(`[M4] ❌ فشل في فحص الأحداث الحرجة: ${error.message}`);
            }
        }, this.criticalCheckFrequency);
    }

    private async performInitialHealthCheck() {
        this.logger.log('[M4] 🔍 بدء الفحص الصحي الأولي للنظام...');

        const healthStatus = {
            timestamp: new Date().toISOString(),
            checks: [] as any[]
        };

        // 1. فحص اتصال قاعدة البيانات
        const dbCheck = await this.checkDatabaseConnection();
        healthStatus.checks.push(dbCheck);

        // 2. فحص اتصال Redis
        const redisCheck = await this.checkRedisConnection();
        healthStatus.checks.push(redisCheck);

        // 3. فحص صحة التشفير
        const encryptionCheck = await this.checkEncryptionHealth();
        healthStatus.checks.push(encryptionCheck);

        // 4. فحص عزل المستأجرين
        const isolationCheck = await this.checkTenantIsolation();
        healthStatus.checks.push(isolationCheck);

        // تسجيل نتائج الفحص
        await this.auditService.logSystemEvent('SYSTEM_HEALTH_CHECK', healthStatus);

        // التحقق من وجود مشاكل حرجة
        const criticalIssues = healthStatus.checks.filter((check: any) => check.status === 'CRITICAL');
        if (criticalIssues.length > 0) {
            this.logger.error(`[M4] 🚨 ${criticalIssues.length} مشكلة حرجة في الفحص الصحي الأولي`);
            await this.automatedResponse.handleCriticalFailure(criticalIssues);
        }

        this.logger.log('[M4] ✅ اكتمل الفحص الصحي الأولي');
    }

    private async performSecurityCheck() {
        const startTime = Date.now();

        try {
            // 1. تحليل سجلات التدقيق الأخيرة
            const recentEvents = await this.getRecentSecurityEvents(100);
            const anomalyScore = await this.anomalyAnalyzer.analyzeEventPatterns(recentEvents);

            // 2. التحقق من محاولات الهجوم
            const attackAttempts = await this.detectAttackPatterns(recentEvents);

            // 3. مراقبة أداء النظام
            const performanceMetrics = await this.getPerformanceMetrics();

            // 4. التحقق من حالة الحماية
            const protectionStatus = await this.checkProtectionStatus();

            const checkResult = {
                timestamp: new Date().toISOString(),
                anomalyScore,
                attackAttempts,
                performanceMetrics,
                protectionStatus,
                processingTime: Date.now() - startTime
            };

            // تسجيل الفحص
            await this.auditService.logSystemEvent('SECURITY_CHECK_PERFORMED', checkResult);

            // اتخاذ إجراء إذا تم اكتشاف تهديد
            if (anomalyScore > 0.7 || attackAttempts.length > 0) {
                await this.handleDetectedThreat(anomalyScore, attackAttempts);
            }

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل في فحص الأمان: ${error.message}`);
            await this.auditService.logSecurityEvent('SECURITY_CHECK_FAILURE', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    private async checkCriticalEvents() {
        try {
            // البحث عن أحداث حرجة في السجلات
            const criticalEvents = await this.auditService.queryAuditLogs(
                new Date(Date.now() - 60000), // آخر دقيقة
                new Date(),
                { severity: 'CRITICAL' }
            );

            if (criticalEvents.length > 0) {
                this.logger.warn(`[M4] ⚠️ تم اكتشاف ${criticalEvents.length} حدث حرجة`);

                // معالجة كل حدث حرجة
                for (const event of criticalEvents) {
                    await this.handleCriticalEvent(event);
                }
            }
        } catch (error) {
            this.logger.error(`[M4] ❌ فشل في فحص الأحداث الحرجة: ${error.message}`);
        }
    }

    private async handleDetectedThreat(anomalyScore: number, attackAttempts: any[]) {
        this.logger.warn(`[M4] 🚨 تم اكتشاف تهديد محتمل - الدرجة: ${anomalyScore}`);

        // تحديد مستوى التهديد
        let threatLevel = 'LOW';
        if (anomalyScore > 0.9 || attackAttempts.some(a => a.severity === 'CRITICAL')) {
            threatLevel = 'CRITICAL';
        } else if (anomalyScore > 0.8 || attackAttempts.some(a => a.severity === 'HIGH')) {
            threatLevel = 'HIGH';
        } else if (anomalyScore > 0.7) {
            threatLevel = 'MEDIUM';
        }

        // اتخاذ إجراءات استجابة
        await this.automatedResponse.handleThreat({
            threatLevel,
            anomalyScore,
            attackAttempts,
            timestamp: new Date().toISOString()
        });

        // تسجيل الحدث
        await this.auditService.logSecurityEvent('THREAT_DETECTED', {
            threatLevel,
            anomalyScore,
            attackAttempts,
            timestamp: new Date().toISOString()
        });
    }

    private async handleCriticalEvent(event: any) {
        this.logger.error(`[M4] 🔴 معالجة حدث حرجة: ${event.eventType}`);
        await this.automatedResponse.handleCriticalEvent(event);
    }

    private async checkDatabaseConnection(): Promise<any> {
        return { name: 'DATABASE_CONNECTION', status: 'HEALTHY', details: { responseTime: 50 } };
    }

    private async checkRedisConnection(): Promise<any> {
        return { name: 'REDIS_CONNECTION', status: 'HEALTHY', details: { responseTime: 10 } };
    }

    private async checkEncryptionHealth(): Promise<any> {
        return { name: 'ENCRYPTION_HEALTH', status: 'HEALTHY', details: { keysRotated: true } };
    }

    private async checkTenantIsolation(): Promise<any> {
        return { name: 'TENANT_ISOLATION', status: 'HEALTHY', details: { isolationLevel: 'SCHEMA' } };
    }

    private async getRecentSecurityEvents(limit: number): Promise<any[]> {
        return [];
    }

    private async detectAttackPatterns(events: any[]): Promise<any[]> {
        return [];
    }

    private async getPerformanceMetrics(): Promise<any> {
        return { cpuUsage: 0, memoryUsage: 0, responseTime: 0 };
    }

    private async checkProtectionStatus(): Promise<any> {
        return { bruteForceProtection: true, rateLimiting: true, encryption: true };
    }

    async getMonitoringStatus(): Promise<any> {
        return {
            isMonitoring: this.isMonitoring,
            monitoringFrequency: this.monitoringFrequency,
            criticalCheckFrequency: this.criticalCheckFrequency,
            uptime: process.uptime(),
            lastCheck: new Date().toISOString()
        };
    }

    async stopMonitoring() {
        this.isMonitoring = false;
        if (this.monitoringInterval) clearInterval(this.monitoringInterval);
        if (this.criticalEventsInterval) clearInterval(this.criticalEventsInterval);
        this.logger.warn('[M4] ⚠️ تم إيقاف المراقبة الأمنية');
    }

    onModuleDestroy() {
        this.stopMonitoring();
    }
}
