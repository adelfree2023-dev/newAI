```typescript
import { Logger } from '@nestjs/common';
import { Skill, SkillContext } from '../../shims/ai-agent-types';
import { AuditService } from '../../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../layers/s2-tenant-isolation/tenant-context.service';

export class AnomalyDetectorAgent {
  private readonly logger = new Logger(AnomalyDetectorAgent.name);
  private anomalyPatterns: Map<string, any[]> = new Map();
  private baselineMetrics: Map<string, any> = new Map();

  constructor(
    private readonly runtime: AgentRuntime,
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) {
    this.initializeAnomalyPatterns();
  }

  private initializeAnomalyPatterns() {
    // أنماط السلوك غير الطبيعي المعروفة
    this.anomalyPatterns.set('database', [
      { pattern: 'cross_tenant_query', severity: 'CRITICAL', weight: 0.95 },
      { pattern: 'system_schema_access', severity: 'CRITICAL', weight: 0.99 },
      { pattern: 'excessive_data_access', severity: 'HIGH', weight: 0.85 }
    ]);

    this.anomalyPatterns.set('authentication', [
      { pattern: 'brute_force_login', severity: 'HIGH', weight: 0.90 },
      { pattern: 'credential_stuffing', severity: 'CRITICAL', weight: 0.95 },
      { pattern: 'session_hijacking', severity: 'CRITICAL', weight: 0.97 }
    ]);

    this.anomalyPatterns.set('api', [
      { pattern: 'excessive_rate', severity: 'MEDIUM', weight: 0.75 },
      { pattern: 'unusual_endpoint_access', severity: 'HIGH', weight: 0.85 },
      { pattern: 'parameter_tampering', severity: 'HIGH', weight: 0.90 }
    ]);
  }

  async detectAnomalies(behaviorData: any) {
    try {
      this.logger.debug(`[AI] 🔍 بدء كشف السلوك غير الطبيعي: ${ JSON.stringify(behaviorData) } `);

      const tenantId = behaviorData.tenantId || this.tenantContext.getTenantId() || 'system';
      const contextType = behaviorData.contextType || 'general';

      // 1. التحقق من الأنماط المعروفة
      const knownPatternScore = this.checkKnownPatterns(behaviorData, contextType);

      // 2. التحليل باستخدام الذكاء الاصطناعي
      const aiAnalysis = await this.performAIAnalysis(behaviorData, tenantId, contextType);

      // 3. دمج النتائج
      const combinedScore = this.combineScores(knownPatternScore.score, aiAnalysis.anomalyScore);

      // 4. تحديد مستوى الخطورة
      const severity = this.determineSeverity(combinedScore, aiAnalysis.confidence);

      const result = {
        anomalyDetected: severity !== 'LOW',
        anomalyScore: combinedScore,
        severity,
        confidence: aiAnalysis.confidence,
        detectedPatterns: [...(knownPatternScore.patterns || []), ...(aiAnalysis.patterns || [])],
        recommendations: aiAnalysis.recommendations || [],
        analysisTime: new Date().toISOString(),
        tenantId,
        contextType,
        rawData: behaviorData,
        modelVersion: 'apex-anomaly-v1.2'
      };

      // تسجيل الحدث الأمني إذا كان السلوك غير طبيعي
      if (result.anomalyDetected && severity !== 'LOW') {
        await this.logAnomalyEvent(result);
      }

      this.logger.log(`[AI] 📊 درجة السلوك غير الطبيعي: ${ combinedScore.toFixed(2) } - المستوى: ${ severity } `);

      return result;
    } catch (error) {
      this.logger.error(`[AI] ❌ خطأ في كشف السلوك غير الطبيعي: ${ error.message } `);

      // العودة لنتيجة آمنة في حالة الخطأ
      return {
        anomalyDetected: false,
        anomalyScore: 0.0,
        severity: 'LOW',
        confidence: 0.5,
        detectedPatterns: [],
        recommendations: [],
        analysisTime: new Date().toISOString(),
        tenantId: behaviorData.tenantId || 'system',
        error: error.message,
        fallbackMode: true
      };
    }
  }

  private checkKnownPatterns(behaviorData: any, contextType: string): { score: number; patterns: any[] } {
    const patterns = this.anomalyPatterns.get(contextType) || [];
    let totalScore = 0;
    const detectedPatterns: any[] = [];

    // استخدام معايير مختلفة لكل نوع من السياقات
    const contextRules = {
      'database': {
        maxQueriesPerMinute: 100,
        maxDataVolumeMB: 10,
        maxConcurrentSessions: 5
      },
      'authentication': {
        maxFailedLogins: 5,
        minTimeBetweenLogins: 1000, // 1 ثانية
        maxSessionsPerUser: 10
      },
      'api': {
        maxRequestsPerSecond: 20,
        maxPayloadSizeKB: 1024,
        maxParameters: 50
      }
    };

    const rules = contextRules[contextType as keyof typeof contextRules] || {};

    // التحقق من القواعد الأساسية
    if (behaviorData.requestCount && (rules as any).maxRequestsPerSecond) {
      const rateScore = behaviorData.requestCount / (rules as any).maxRequestsPerSecond;
      if (rateScore > 1.5) {
        totalScore += Math.min(1.0, rateScore * 0.3);
        detectedPatterns.push({
          type: 'excessive_rate',
          score: rateScore,
          threshold: (rules as any).maxRequestsPerSecond
        });
      }
    }

    // التحقق من الأنماط المحددة مسبقاً
    for (const pattern of patterns) {
      if (this.matchesPattern(behaviorData, pattern.pattern)) {
        totalScore += pattern.weight;
        detectedPatterns.push(pattern);
      }
    }

    return {
      score: Math.min(1.0, totalScore),
      patterns: detectedPatterns
    };
  }

  private matchesPattern(behaviorData: any, pattern: string): boolean {
    const lowerData = JSON.stringify(behaviorData).toLowerCase();

    const patternMatches = {
      'cross_tenant_query': /cross.tenant|other.tenant|external.schema/i.test(lowerData),
      'system_schema_access': /system.schema|pg_catalog|information_schema/i.test(lowerData),
      'excessive_data_access': /select.\*|count\(\*\)|large.dataset/i.test(lowerData),
      'brute_force_login': /failed.login.{3,}|password.guess|login.attempt/i.test(lowerData),
      'credential_stuffing': /multiple.accounts|credential.reuse/i.test(lowerData),
      'session_hijacking': /session.fixation|cookie.stealing/i.test(lowerData),
      'unusual_endpoint_access': /admin|debug|internal|config/i.test(lowerData),
      'parameter_tampering': /sql.injection|xss|command.injection/i.test(lowerData)
    };

    return patternMatches[pattern as keyof typeof patternMatches] || false;
  }

  private async performAIAnalysis(behaviorData: any, tenantId: string, contextType: string) {
    try {
      const context = {
        timestamp: new Date().toISOString(),
        behaviorData,
        tenantId,
        contextType,
        historicalData: await this.getHistoricalMetrics(tenantId, contextType),
        systemContext: {
          environment: process.env.NODE_ENV,
          services: ['database', 'api', 'authentication'],
          isolationLevel: 'SCHEMA'
        }
      };

      const result = await this.runtime.executeSkill('anomaly-detection', context);

      return {
        anomalyScore: result.score || 0.5,
        confidence: result.confidence || 0.8,
        patterns: result.patterns || [],
        recommendations: result.recommendations || [],
        analysisMethod: 'ai_hybrid'
      };
    } catch (error) {
      this.logger.warn(`[AI] ⚠️ فشل التحليل بالذكاء الاصطناعي، استخدام المنهج الهجين: ${ error.message } `);

      // استخدام منهج هجين كخيار احتياطي
      return {
        anomalyScore: 0.3,
        confidence: 0.6,
        patterns: [],
        recommendations: ['manual_review_required'],
        analysisMethod: 'hybrid_fallback'
      };
    }
  }

  private async getHistoricalMetrics(tenantId: string, contextType: string) {
    // في الإصدار الحقيقي، سيتم جلب هذه البيانات من قاعدة البيانات
    // هنا نستخدم بيانات محاكاة
    const now = new Date();
    const metrics = [];

    for (let i = 1; i <= 60; i++) {
      const timestamp = new Date(now.getTime() - i * 60000);
      metrics.push({
        timestamp: timestamp.toISOString(),
        requestCount: Math.floor(Math.random() * 50),
        errorRate: Math.random() * 0.1,
        anomalyScore: Math.random() * 0.3
      });
    }

    return metrics;
  }

  private combineScores(knownScore: number, aiScore: number): number {
    // دمج الدرجات مع ترجيح أكثر للأنماط المعروفة
    return Math.min(1.0, (knownScore * 0.7) + (aiScore * 0.3));
  }

  private determineSeverity(score: number, confidence: number): string {
    if (score >= 0.8 && confidence >= 0.85) return 'CRITICAL';
    if (score >= 0.6 && confidence >= 0.8) return 'HIGH';
    if (score >= 0.4 && confidence >= 0.7) return 'MEDIUM';
    return 'LOW';
  }

  private async logAnomalyEvent(result: any) {
    const severityLevels = {
      'CRITICAL': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };

    const severityValue = severityLevels[result.severity as keyof typeof severityLevels] || 1;

    await this.auditService.logSecurityEvent('ANOMALY_DETECTED', {
      tenantId: result.tenantId,
      severity: result.severity,
      anomalyScore: result.anomalyScore,
      confidence: result.confidence,
      detectedPatterns: result.detectedPatterns,
      recommendations: result.recommendations,
      contextType: result.contextType,
      analysisTime: result.analysisTime,
      severityValue,
      modelVersion: result.modelVersion,
      timestamp: new Date().toISOString()
    });

    // إرسال تنبيه فوري للمستويات الحرجة
    if (result.severity === 'CRITICAL' || result.severity === 'HIGH') {
      this.logger.error(`[AI] 🚨 تنبيه فوري: سلوك غير طبيعي ${ result.severity } كشف للمستأجر: ${ result.tenantId } `);
      // سيتم إضافة إرسال التنبيهات الفعلية في الإصدار التالي
    }
  }

  async updateBaseline(tenantId: string, contextType: string, metrics: any) {
    const key = `${ tenantId }:${ contextType } `;
    this.baselineMetrics.set(key, {
      ...metrics,
      lastUpdated: new Date().toISOString(),
      tenantId,
      contextType
    });

    this.logger.debug(`[AI] 📈 تم تحديث خط الأساس للمستأجر: ${ tenantId } - السياق: ${ contextType } `);
  }

  getBaseline(tenantId: string, contextType: string): any | null {
    const key = `${ tenantId }:${ contextType } `;
    return this.baselineMetrics.get(key) || null;
  }
}
