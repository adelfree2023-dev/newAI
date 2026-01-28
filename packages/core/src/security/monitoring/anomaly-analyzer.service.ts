import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';

@Injectable()
export class AnomalyAnalyzerService {
    private readonly logger = new Logger(AnomalyAnalyzerService.name);
    private baselineMetrics: Map<string, any> = new Map();
    private anomalyThreshold: number;
    private readonly patterns = {
        BRUTE_FORCE: /failed.login.{3,}|password.guess|login.attempt/i,
        SQL_INJECTION: /union.select|drop.table|';.--|exec\s*\(/i,
        XSS_ATTACK: /<script>|javascript:|onerror=/i,
        DATA_EXFILTRATION: /select.\*|dump|export/i,
        PRIVILEGE_ESCALATION: /admin|superuser|root/i
    };

    constructor(
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService,
        private readonly encryptionService: EncryptionService
    ) {
        this.anomalyThreshold = 0.7; // عتبة الكشف عن السلوك غير الطبيعي
    }

    /**
     * تحليل أنماط الأحداث الأمنية
     */
    async analyzeEventPatterns(events: any[]): Promise<number> {
        try {
            this.logger.debug(`[M4] 🔍 تحليل ${events.length} حدث أمني`);

            let anomalyScore = 0;
            const detectedPatterns: string[] = [];

            // تحليل كل حدث
            for (const event of events) {
                const eventScore = await this.analyzeSingleEvent(event);
                anomalyScore += eventScore.score;

                if (eventScore.patterns.length > 0) {
                    detectedPatterns.push(...eventScore.patterns);
                }
            }

            // حساب الدرجة النهائية
            const normalizedScore = events.length > 0 ? anomalyScore / events.length : 0;

            // تسجيل النتائج
            if (normalizedScore > this.anomalyThreshold) {
                await this.auditService.logSecurityEvent('ANOMALY_DETECTED', {
                    score: normalizedScore,
                    patterns: detectedPatterns,
                    eventCount: events.length,
                    timestamp: new Date().toISOString()
                });
            }

            this.logger.debug(`[M4] ✅ درجة السلوك غير الطبيعي: ${normalizedScore.toFixed(2)}`);

            return normalizedScore;

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل في تحليل الأنماط: ${error.message}`);
            return 0;
        }
    }

    /**
     * تحليل حدث واحد
     */
    private async analyzeSingleEvent(event: any): Promise<{ score: number; patterns: string[] }> {
        let score = 0;
        const detectedPatterns: string[] = [];

        // 1. التحقق من نمط الهجوم
        const patternScore = this.checkAttackPatterns(event);
        score += patternScore.score;
        detectedPatterns.push(...patternScore.patterns);

        // 2. التحقق من التكرار غير الطبيعي
        const frequencyScore = await this.checkFrequencyAnomaly(event);
        score += frequencyScore;

        // 3. التحقق من السياق غير الطبيعي
        const contextScore = this.checkContextAnomaly(event);
        score += contextScore;

        // 4. التحقق من شدة الحدث
        const severityScore = this.checkSeverityAnomaly(event);
        score += severityScore;

        return {
            score: Math.min(1.0, score), // الحد الأقصى 1.0
            patterns: detectedPatterns
        };
    }

    /**
     * التحقق من أنماط الهجوم
     */
    private checkAttackPatterns(event: any): { score: number; patterns: string[] } {
        const eventData = JSON.stringify(event).toLowerCase();
        let score = 0;
        const detectedPatterns: string[] = [];

        // التحقق من كل نمط
        for (const [patternName, pattern] of Object.entries(this.patterns)) {
            if (pattern.test(eventData)) {
                score += 0.3;
                detectedPatterns.push(patternName);

                this.logger.warn(`[M4] ⚠️ اكتشاف نمط هجوم: ${patternName}`);
            }
        }

        return { score: Math.min(1.0, score), patterns: detectedPatterns };
    }

    /**
     * التحقق من التكرار غير الطبيعي
     */
    private async checkFrequencyAnomaly(event: any): Promise<number> {
        const tenantId = event.context?.tenantId || 'system';
        const eventType = event.eventType;

        // الحصول على المقاييس الأساسية
        const baseline = this.getBaseline(tenantId, eventType);

        // حساب معدل التكرار الحالي
        const currentRate = await this.getCurrentEventRate(tenantId, eventType);

        // مقارنة مع الأساس
        if (baseline && currentRate > baseline.rate * 2) {
            this.logger.warn(`[M4] ⚠️ تكرار غير طبيعي لـ ${eventType}: ${currentRate} vs ${baseline.rate}`);
            return 0.4;
        }

        return 0;
    }

    /**
     * التحقق من السياق غير الطبيعي
     */
    private checkContextAnomaly(event: any): number {
        let score = 0;

        // التحقق من وقت غير طبيعي
        const hour = new Date(event.timestamp).getHours();
        if (hour >= 0 && hour <= 5) {
            score += 0.1;
        }

        // التحقق من عنوان IP غير مألوف
        const ip = event.context?.ipAddress;
        if (ip && !this.isKnownIp(ip)) {
            score += 0.2;
        }

        // التحقق من وكيل مستخدم غير مألوف
        const userAgent = event.context?.userAgent;
        if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
            score += 0.3;
        }

        return score;
    }

    /**
     * التحقق من شدة الحدث
     */
    private checkSeverityAnomaly(event: any): number {
        const severity = event.severity || 'LOW';

        switch (severity) {
            case 'CRITICAL':
                return 0.5;
            case 'HIGH':
                return 0.3;
            case 'MEDIUM':
                return 0.1;
            default:
                return 0;
        }
    }

    /**
     * الحصول على المقاييس الأساسية
     */
    private getBaseline(tenantId: string, eventType: string): any | null {
        const key = `${tenantId}:${eventType}`;
        return this.baselineMetrics.get(key) || null;
    }

    /**
     * تحديث المقاييس الأساسية
     */
    async updateBaseline(tenantId: string, eventType: string, metrics: any) {
        const key = `${tenantId}:${eventType}`;
        this.baselineMetrics.set(key, {
            ...metrics,
            lastUpdated: new Date().toISOString()
        });

        // تنظيف المقاييس القديمة (أكثر من 24 ساعة)
        this.cleanupOldBaselines();
    }

    /**
     * تنظيف المقاييس القديمة
     */
    private cleanupOldBaselines() {
        const now = new Date();
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        for (const [key, value] of this.baselineMetrics.entries()) {
            const lastUpdated = new Date(value.lastUpdated);
            if (lastUpdated < twentyFourHoursAgo) {
                this.baselineMetrics.delete(key);
            }
        }
    }

    /**
     * الحصول على معدل الأحداث الحالي
     */
    private async getCurrentEventRate(tenantId: string, eventType: string): Promise<number> {
        // سيتم تنفيذ حساب المعدل الفعلي هنا
        return 10; // معدل افتراضي
    }

    /**
     * التحقق مما إذا كان عنوان IP معروفاً
     */
    private isKnownIp(ip: string): boolean {
        // سيتم تنفيذ التحقق الفعلي هنا
        return false;
    }

    /**
     * التحقق مما إذا كان وكيل المستخدم مشبوهاً
     */
    private isSuspiciousUserAgent(userAgent: string): boolean {
        const suspiciousKeywords = ['bot', 'crawler', 'python-requests', 'curl'];
        return suspiciousKeywords.some(keyword => userAgent.toLowerCase().includes(keyword));
    }

    /**
     * تحليل سلوك المستخدم
     */
    async analyzeUserBehavior(userId: string, events: any[]): Promise<any> {
        try {
            this.logger.debug(`[M4] 📊 تحليل سلوك المستخدم: ${userId}`);

            const behaviorMetrics = {
                loginAttempts: 0,
                failedLogins: 0,
                dataAccessCount: 0,
                adminActions: 0,
                timeOfDayDistribution: {},
                ipAddressChanges: 0
            };

            // تحليل كل حدث
            for (const event of events) {
                if (event.eventType === 'USER_LOGIN') {
                    behaviorMetrics.loginAttempts++;

                    if (event.eventData?.success === false) {
                        behaviorMetrics.failedLogins++;
                    }
                }

                if (event.eventType.includes('DATA_ACCESS')) {
                    behaviorMetrics.dataAccessCount++;
                }

                if (event.eventType.includes('ADMIN')) {
                    behaviorMetrics.adminActions++;
                }

                // تحليل وقت اليوم
                const hour = new Date(event.timestamp).getHours();
                const timeSlot = Math.floor(hour / 4); // تقسيم اليوم إلى 6 فترات
                behaviorMetrics.timeOfDayDistribution[timeSlot] =
                    (behaviorMetrics.timeOfDayDistribution[timeSlot] || 0) + 1;
            }

            // حساب درجة السلوك غير الطبيعي
            let anomalyScore = 0;

            // نسبة محاولات تسجيل الدخول الفاشلة
            if (behaviorMetrics.loginAttempts > 0) {
                const failureRate = behaviorMetrics.failedLogins / behaviorMetrics.loginAttempts;
                if (failureRate > 0.5) {
                    anomalyScore += 0.4;
                }
            }

            // عدد الإجراءات الإدارية
            if (behaviorMetrics.adminActions > 10) {
                anomalyScore += 0.2;
            }

            // توزيع وقت اليوم غير الطبيعي
            const timeSlots = Object.values(behaviorMetrics.timeOfDayDistribution);
            if (timeSlots.length > 0 && Math.max(...timeSlots) / Math.min(...timeSlots) > 5) {
                anomalyScore += 0.3;
            }

            return {
                userId,
                metrics: behaviorMetrics,
                anomalyScore,
                riskLevel: anomalyScore > 0.7 ? 'HIGH' : anomalyScore > 0.4 ? 'MEDIUM' : 'LOW',
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل في تحليل سلوك المستخدم: ${error.message}`);
            return null;
        }
    }

    /**
     * تحليل سلوك جميع المستخدمين
     */
    private async analyzeAllUserBehaviors(events: any[]): Promise<any[]> {
        // سيتم تنفيذ التحليل الفعلي هنا
        return [];
    }
}
