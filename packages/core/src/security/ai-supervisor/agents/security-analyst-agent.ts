import { Logger } from '@nestjs/common';
import { AgentRuntime } from '../../shims/ai-agent-types';
import { AuditService } from '../../layers/s4-audit-logging/audit.service';
import { ZodSchema } from 'zod';

export class SecurityAnalystAgent {
  private readonly logger = new Logger(SecurityAnalystAgent.name);

  constructor(
    private readonly runtime: AgentRuntime,
    private readonly auditService: AuditService
  ) {}

  async analyzeSecurityPosture(postureData: any, schema: ZodSchema) {
    try {
      this.logger.log('[AI] 🔍 بدء تحليل موضع الأمان الشامل');
      
      const context = {
        timestamp: new Date().toISOString(),
        analysisType: 'SECURITY_POSTURE_ANALYSIS',
        systemContext: {
          environment: process.env.NODE_ENV,
          nodeVersion: process.versions.node,
          platform: process.platform
        },
        data: postureData,
        tenantContext: {
          tenantId: postureData.tenantId || 'system',
          isolationLevel: 'SCHEMA_ISOLATION'
        }
      };

      const result = await this.runtime.executeSkill('security-analysis', context);
      
      // التحقق من صحة النتيجة باستخدام Zod
      const validatedResult = schema.parse(result);
      
      // تسجيل التحليل
      await this.auditService.logSecurityEvent('SECURITY_POSTURE_ANALYSIS', {
        ...context,
        result: validatedResult,
        timestamp: new Date().toISOString()
      });

      this.logger.log(`[AI] ✅ اكتمل تحليل موضع الأمان. درجة المخاطرة: ${validatedResult.overallSecurityScore}`);
      
      return validatedResult;
    } catch (error) {
      this.logger.error(`[AI] ❌ فشل تحليل موضع الأمان: ${error.message}`);
      
      await this.auditService.logSecurityEvent('SECURITY_ANALYSIS_FAILURE', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  async generateSecurityRecommendations(securityData: any) {
    try {
      this.logger.log('[AI] 📋 بدء توليد توصيات أمنية مخصصة');
      
      const context = {
        timestamp: new Date().toISOString(),
        analysisType: 'SECURITY_RECOMMENDATIONS',
        securityData,
        tenantId: securityData.tenantId || 'system'
      };

      const recommendations = await this.runtime.executeSkill('security-recommendations', context);
      
      await this.auditService.logSecurityEvent('SECURITY_RECOMMENDATIONS_GENERATED', {
        tenantId: securityData.tenantId || 'system',
        recommendations,
        timestamp: new Date().toISOString()
      });

      this.logger.log(`[AI] ✅ تم توليد ${recommendations.length} توصية أمنية`);
      
      return recommendations;
    } catch (error) {
      this.logger.error(`[AI] ❌ فشل توليد التوصيات الأمنية: ${error.message}`);
      return [];
    }
  }
}
