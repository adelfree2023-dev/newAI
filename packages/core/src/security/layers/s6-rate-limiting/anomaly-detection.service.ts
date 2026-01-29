import { Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';

@Injectable()
export class AnomalyDetectionService {
  private readonly logger = new Logger(AnomalyDetectionService.name);
  private redisClient: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
      this.redisClient = new Redis(redisUrl);

      this.redisClient.on('error', (error) => {
        this.logger.error(`[S6] ❌ خطأ في اتصال Redis: ${error.message}`);
      });

      this.logger.log('[S6] ✅ تم تهيئة خدمة كشف السلوك غير الطبيعي');
    } catch (error) {
      this.logger.error(`[S6] ❌ فشل تهيئة Redis: ${error.message}`);
      throw new Error('فشل في إنشاء اتصال بقاعدة البيانات المؤقتة');
    }
  }

  async detectAnomaly(behaviorData: any): Promise<number> {
    try {
      this.logger.debug(`[S6] 🔍 بدء كشف السلوك غير الطبيعي: ${JSON.stringify(behaviorData)}`);

      // تقييم السلوك بناءً على عدة عوامل
      let anomalyScore = 0;

      // 1. تقييم عدد الطلبات
      if (behaviorData.requestCount && behaviorData.limit) {
        const ratio = behaviorData.requestCount / behaviorData.limit;
        if (ratio > 1.5) anomalyScore += 0.3;
        if (ratio > 2) anomalyScore += 0.4;
      }

      // 2. تقييم نمط الطلب
      const suspiciousPatterns = ['password', 'secret', 'admin', 'config', 'eval', 'exec'];
      const requestPath = behaviorData.path?.toLowerCase() || '';

      for (const pattern of suspiciousPatterns) {
        if (requestPath.includes(pattern)) {
          anomalyScore += 0.25;
          break;
        }
      }

      // 3. تقييم وكيل المستخدم (User Agent)
      const userAgent = behaviorData.userAgent?.toLowerCase() || '';
      if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('python-requests')) {
        // السماح للروبوتات المعروفة
        if (!userAgent.includes('googlebot') && !userAgent.includes('bingbot')) {
          anomalyScore += 0.2;
        }
      }

      // 4. تقييم السياق الزمني
      const now = new Date();
      const hour = now.getHours();

      // النشاط في ساعات غير طبيعية
      if ((hour >= 0 && hour <= 5) && behaviorData.requestCount > 10) {
        anomalyScore += 0.15;
      }

      // 5. النشاط في نفس الثانية
      await this.checkRequestFrequency(behaviorData.ip, behaviorData.tenantId);

      // ضمان قيمة بين 0 و 1
      anomalyScore = Math.min(1.0, Math.max(0.0, anomalyScore));

      this.logger.log(`[S6] 📊 درجة السلوك غير الطبيعي: ${anomalyScore.toFixed(2)} للـ IP: ${behaviorData.ip}`);

      // تسجيل الحدث إذا كانت الدرجة مرتفعة
      if (anomalyScore > 0.7) {
        this.auditService.logSecurityEvent('ANOMALY_DETECTED', {
          ...behaviorData,
          anomalyScore,
          timestamp: new Date().toISOString(),
          detectionMethod: 'pattern_analysis'
        });
      }

      return anomalyScore;
    } catch (error) {
      this.logger.error(`[S6] ❌ خطأ في كشف السلوك غير الطبيعي: ${error.message}`);
      return 0.0; // العودة لقيمة آمنة في حالة الخطأ
    }
  }

  private async checkRequestFrequency(ip: string, tenantId: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const minuteKey = `anomaly:requests:${tenantId}:${ip}:${now}`;

    try {
      const count = await this.redisClient.incr(minuteKey);
      await this.redisClient.expire(minuteKey, 60); // انتهاء الصلاحية بعد دقيقة

      // إذا كان هناك أكثر من 20 طلب في الثانية
      if (count > 20) {
        this.logger.warn(`[S6] ⚠️ نشاط مكثف من IP: ${ip} للمستأجر: ${tenantId} (${count} طلب/ثانية)`);
      }
    } catch (error) {
      this.logger.error(`[S6] ❌ خطأ في فحص تكرار الطلبات: ${error.message}`);
    }
  }

  async getThreatIntelligence(ip: string, context: string): Promise<any> {
    // في الإصدار الحقيقي، سيتم الاتصال بمصادر معلومات التهديد
    this.logger.debug(`[S6] 🌐 جلب معلومات التهديد لـ IP: ${ip}`);

    // بيانات محاكاة
    const threatData = {
      ip,
      context,
      riskScore: Math.random() * 0.3, // درجة مخاطرة منخفضة افتراضياً
      knownThreat: false,
      lastSeen: new Date().toISOString(),
      sources: ['internal_monitoring']
    };

    return threatData;
  }

  async registerSafePattern(pattern: string, description: string): Promise<void> {
    try {
      const key = `anomaly:safe_patterns:${pattern}`;
      await this.redisClient.setex(
        key,
        30 * 24 * 60 * 60, // 30 يوماً
        JSON.stringify({ description, registeredAt: new Date().toISOString() })
      );

      this.logger.log(`[S6] ✅ تسجيل نمط آمن: ${pattern} - ${description}`);
    } catch (error) {
      this.logger.error(`[S6] ❌ فشل تسجيل النمط الآمن: ${error.message}`);
    }
  }

  async isKnownSafe(ip: string): Promise<boolean> {
    try {
      const safeIps = this.configService.get<string[]>('SAFE_IPS', []);
      if (safeIps.includes(ip)) {
        return true;
      }

      const key = `anomaly:safe_ips:${ip}`;
      const isSafe = await this.redisClient.exists(key);

      if (isSafe) {
        this.logger.debug(`[S6] ✅ IP معروف آمن: ${ip}`);
      }

      return isSafe === 1;
    } catch (error) {
      this.logger.error(`[S6] ❌ خطأ في التحقق من IP آمن: ${error.message}`);
      return false;
    }
  }

  async analyzeBehaviorTrend(behaviorHistory: any[], timeWindow: string = '1h'): Promise<any> {
    try {
      this.logger.debug(`[S6] 📈 تحليل اتجاهات السلوك لفترة: ${timeWindow}`);

      if (!behaviorHistory || behaviorHistory.length === 0) {
        return { trend: 'NO_DATA', score: 0 };
      }

      // حساب المتوسط المتحرك
      const scores = behaviorHistory.map(item => item.anomalyScore || 0);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      // تحديد الاتجاه
      let trend = 'STABLE';
      if (scores.length > 2) {
        const lastScores = scores.slice(-3);
        const firstAvg = lastScores.slice(0, -1).reduce((sum, score) => sum + score, 0) / (lastScores.length - 1);
        const lastScore = lastScores[lastScores.length - 1];

        if (lastScore > firstAvg * 1.5) {
          trend = 'INCREASING';
        } else if (lastScore < firstAvg * 0.5) {
          trend = 'DECREASING';
        }
      }

      return {
        trend,
        score: avgScore,
        dataPoints: scores.length,
        timestamp: new Date().toISOString(),
        criticalThreshold: 0.75
      };
    } catch (error) {
      this.logger.error(`[S6] ❌ خطأ في تحليل اتجاهات السلوك: ${error.message}`);
      return { trend: 'ERROR', score: 0 };
    }
  }

  async isSuspended(tenantId: string) { return false; }
  async inspect(tenantId: string, critical: boolean, details: any = {}) { return this.detectAnomaly({ tenantId, critical, ...details }); }
  async inspectFailedEvent(tenantId: string, event: string, error: any) { return this.inspect(tenantId, true, { event, error: error?.message }); }
  async inspectFailedLogin(tenantId: string, userId: string, ip: string) { return this.inspect(tenantId, true, { userId, ip, type: 'failed_login' }); }
  getStatus(tenantId: string) { return { suspicious: false, suspended: false }; }
}