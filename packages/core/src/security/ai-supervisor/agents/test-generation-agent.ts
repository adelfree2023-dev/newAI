import { OpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * وكيل ذكي حقيقي لتوليد اختبارات بجودة عالية
 * يستخدم نموذج لغوي لفهم الكود وكتابة اختبارات ذات معنى
 */
export class SmartTestGenerationAgent {
    name = 'smart-test-generation-agent';
    description = 'توليد اختبارات ذكية باستخدام LLM لفهم منطق العمل';

    // إعداد نموذج OpenAI
    private llm = new OpenAI({
        modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo',
        temperature: 0.1,
        openAIApiKey: process.env.OPENAI_API_KEY
    });

    // مخطط المحادثة (Prompt Template)
    private prompt = ChatPromptTemplate.fromMessages([
        ['system', `أنت مطور QA محترف متخصص في NestJS و Jest.
المهام:
1. تحليل الكود المقدم وفهم المنطق التجاري
2. تحديد الحالات الحرجة والحافة
3. كتابة اختبارات Jest حقيقية بتغطية عالية
4. استخدام مزيفات (mocks) مناسبة لكل سيناريو

القواعد:
- لا تستخدم expect(true).toBe(true) — هذا اختبار عديم الفائدة
- لكل طريقة، أنشئ اختبارات للحالات الناجحة + حالات الخطأ
- استخدم مزيفات واقعية تعكس السلوك الفعلي للتبعيات (استخدم Proxy mocks إذا لزم الأمر)
- أضف تعليقات توضيحية // Arrange, // Act, // Assert`],
        ['human', `الكود المصدر:
\`\`\`typescript
{code}
\`\`\`

اسم الملف: {fileName}

المطلوب: أنشئ ملف اختبار .spec.ts كامل يحقق تغطية عالية`]
    ]);

    // إنشاء سلسلة تنفيذ (Chain)
    private chain = RunnableSequence.from([
        this.prompt,
        this.llm,
        (response: any) => this.extractCodeBlock(response?.text || response.toString())
    ]);

    /**
     * تنفيذ الوكيل الذكي
     */
    async execute(input: { filePath: string; content: string }) {
        try {
            const fileName = input.filePath.split('/').pop() || 'unknown.ts';

            const result = await this.chain.invoke({
                code: input.content,
                fileName: fileName
            });

            return {
                success: true,
                specContent: result,
                message: '✅ تم توليد الاختبارات بنجاح باستخدام الذكاء الاصطناعي'
            };
        } catch (error: any) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'فشل في توليد الاختبارات',
                message: '❌ فشل الوكيل الذكي — تحقق من مفتاح API'
            };
        }
    }

    /**
     * استخراج كود الاختبار من رد الـ LLM
     */
    private extractCodeBlock(response: string): string {
        const match = response.match(/```(?:typescript|ts)?\s*\n([\s\S]*?)\n```/);
        return match ? match[1].trim() : response.trim();
    }
}
