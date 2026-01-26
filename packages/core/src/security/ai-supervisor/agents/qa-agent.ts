import { Logger } from '@nestjs/common';
import { AgentRuntime } from '@vercel/ai';
import { AuditService } from '../../../layers/s4-audit-logging/audit.service';

/**
 * [QA] QualityAssuranceAgent
 * وكيل ذكاء اصطناعي متخصص في ضمان جودة الكود وتوليد ملفات الاختبار آلياً.
 */
export class QualityAssuranceAgent {
    private readonly logger = new Logger(QualityAssuranceAgent.name);

    constructor(
        private readonly runtime: AgentRuntime,
        private readonly auditService: AuditService
    ) { }

    /**
     * توليد ملف اختبار spec.ts لملف برمجي معين
     */
    async generateSpecFile(filePath: string, fileContent: string) {
        try {
            this.logger.log(`[AI-QA] 🧪 بدء توليد ملف اختبار لـ: ${filePath}`);

            const context = {
                action: 'GENERATE_SPEC',
                filePath,
                content: fileContent,
                testFramework: 'Jest',
                platform: 'NestJS'
            };

            const result = await this.runtime.executeSkill('test-generation', context);

            if (result.success) {
                this.logger.log(`[AI-QA] ✅ تم توليد كود الاختبار بنجاح لـ: ${filePath}`);
                return result.specContent;
            }

            throw new Error(result.error || 'فشل توليد محتوى الاختبار');
        } catch (error) {
            this.logger.error(`[AI-QA] ❌ فشل توليد ملف الاختبار: ${error.message}`);
            return null;
        }
    }

    /**
     * مراجعة جودة الكود أمنياً ووظيفياً
     */
    async reviewCodeQuality(content: string) {
        const analysis = await this.runtime.executeSkill('security-analysis', { content });
        return analysis;
    }
}
