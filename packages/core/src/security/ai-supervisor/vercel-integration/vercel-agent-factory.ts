import { Injectable, Logger, Scope } from '@nestjs/common';
import { AgentRuntime } from '../shims/ai-agent-types';
import { z, ZodSchema } from 'zod';
import { DatabaseIsolationSkill } from '../skills/database-isolation-skill';
import { SecurityProtocolSkill } from '../skills/security-protocol-skill';
import { ThreatIntelligenceSkill } from '../skills/threat-intelligence-skill';
import { TenantIsolationAgent } from '../agents/tenant-isolation-agent';
import { QualityAssuranceAgent } from '../agents/qa-agent';
import { AuditService } from '../../layers/s4-audit-logging/audit.service';
import { VercelSkillMapper } from './vercel-skill-mapper';

@Injectable({ scope: Scope.REQUEST })
export class VercelAgentFactory {
  private readonly logger = new Logger(VercelAgentFactory.name);
  private runtime: AgentRuntime;
  constructor(private readonly auditService: AuditService) {
    this.initializeRuntime();
  }

  private initializeRuntime() {
    try {
      this.logger.log('🤖 [AI] تهيئة بيئة تشغيل الذكاء الاصطناعي من Vercel...');

      // إنشاء بيئة التشغيل مع المهارات الأساسية
      this.runtime = new AgentRuntime({
        model: process.env.AI_MODEL || 'gpt-4o',
        temperature: 0.3,
        maxTokens: 2000,
        skills: [
          new DatabaseIsolationSkill(),
          new SecurityProtocolSkill(),
          new ThreatIntelligenceSkill()
        ],
        systemPrompt: `
          أنت Apex AI Security Agent، مسؤول عن حماية منصة Apex متعددة المستأجرين.
          مهمتك الأساسية هي كشف و ngăn أي محاولات لاختراق عزل البيانات بين المستأجرين.
          لديك صلاحيات عالية في مراقبة النظام وإيقاف العمليات المشبوهة فوراً.
          استخدم مهاراتك للتحقق من:
          1. سلامة عزل مخططات قاعدة البيانات
          2. توافق العمليات مع بروتوكول ASMP
          3. تحليل التهديدات في الوقت الفعلي
          
          قواعد التفاعل:
          - كن حذراً جداً مع أي عملية تشير إلى اختراق العزل
          - الأولوية القصوى لحماية بيانات المستأجرين
          - قدم توصيات واضحة وقابلة للتنفيذ
          - سجل كل حدث أمني مهما كان صغيراً
        `
      });

      this.logger.log('✅ [AI] تم تهيئة بيئة الذكاء الاصطناعي بنجاح');
    } catch (error) {
      this.logger.error(`❌ [AI] فشل تهيئة بيئة الذكاء الاصطناعي: ${error.message}`);
      throw new Error('فشل في تهيئة وكيل الذكاء الاصطناعي');
    }
  }

  createTenantIsolationAgent() {
    return new TenantIsolationAgent(this.runtime, this.auditService);
  }

  createQualityAssuranceAgent() {
    return new QualityAssuranceAgent(this.runtime, this.auditService);
  }

  async executeSkill<T extends ZodSchema>(
    skillName: string,
    input: any,
    schema: T
  ): Promise<z.infer<T>> {
    try {
      this.logger.debug(`[AI] 🎯 تنفيذ المهارة: ${skillName}`);

      const result = await this.runtime.executeSkill(skillName, input);

      // التحقق من صحة النتيجة باستخدام Zod
      const parsedResult = schema.parse(result);

      this.logger.debug(`[AI] ✅ نجاح تنفيذ المهارة: ${skillName}`);
      return parsedResult;
    } catch (error) {
      this.logger.error(`[AI] ❌ فشل تنفيذ المهارة ${skillName}: ${error.message}`);

      // تسجيل حدث أمني
      await this.auditService.logSecurityEvent('AI_SKILL_EXECUTION_FAILURE', {
        skillName,
        error: error.message,
        input,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  async analyzeSecurityThreat(threatData: any) {
    return this.executeSkill('threat-intelligence', threatData, ThreatIntelligenceSkill.outputSchema);
  }

  async validateDatabaseIsolation(isolationData: any) {
    return this.executeSkill('database-isolation', isolationData, DatabaseIsolationSkill.outputSchema);
  }

  async checkProtocolCompliance(protocolData: any) {
    return this.executeSkill('security-protocol', protocolData, SecurityProtocolSkill.outputSchema);
  }
}
