import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

/**
 * وكيل ذكي فائق السرعة يعتمد على Groq (Llama 3.3)
 */
export class SmartTestGenerationAgent {
    name = 'smart-test-generation-agent';
    description = 'توليد اختبارات ذكية باستخدام Groq Llama 3 SDK';

    async execute(input: { filePath: string; content: string }) {
        try {
            const fileName = path.basename(input.filePath);

            const { text } = await generateText({
                model: groq('llama-3.3-70b-versatile') as any,
                system: `أنت مطور QA برتبة (Staff Engineer) متخصص في NestJS و Jest.
        المهمة: كتابة اختبارات منطقية وعميقة (Deep Testing).
        
        القواعد الصارمة:
        - استخدم Jest و TestingModule من NestJS.
        - استخدم Proxy-based Mocks لكل التبعيات (dependencies) لضمان عدم وجود أخطاء undefined.
        - ركز على المنطق التجاري (Business Logic) وليس فقط تغطية السطور.
        - ممنوع استخدام expect(true).toBe(true).
        - أضف اختبارات للحالات الناجحة وحالات الخطأ (Success/Error cases).
        - تأكد من إضافة الـ imports الصحيحة لكل خدمة يتم اختبارها.`,
                prompt: `حلل الكود التالي لملف [\${fileName}] وأنشئ ملف اختبار .spec.ts كامل واحترافي: \n\n \`\`\`typescript\n\${input.content}\n\`\`\``,
            });

            return {
                success: true,
                specContent: this.extractCodeBlock(text),
                message: '✅ تم التوليد بنجاح باستخدام Groq'
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    private extractCodeBlock(response: string): string {
        const match = response.match(/```(?:typescript|ts)?\s*\n([\s\S]*?)\n```/);
        return match ? match[1].trim() : response.trim();
    }
}
