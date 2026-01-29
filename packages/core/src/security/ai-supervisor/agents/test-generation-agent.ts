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
                system: `You are a Staff QA Engineer specializing in NestJS and Jest.
Your mission: Generate high-quality, deep Jest unit tests for the provided NestJS file.

STRICT RULES:
1. ONLY output the contents of the .spec.ts file. No explanation, no wrap-around text.
2. Use 'describe', 'it', 'expect' from @jest/globals (or global jest).
3. Use 'Test' and 'TestingModule' from '@nestjs/testing'.
4. USE PROXY-BASED MOCKS for all dependencies to avoid 'undefined' errors.
5. FOCUSE ON BUSINESS LOGIC, not just line coverage.
6. MOCK TYPEORM REPOSITORIES using 'Repository<Entity>' and 'jest.fn()'.
7. DON'T access private members directly. Use '(service as any).privateMethod' if absolutely necessary, but prioritize public API.
8. IMPORT PATHS:
   - User entity: 'src/auth/entities/user.entity' (Class name: User)
   - Session entity: 'src/auth/entities/session.entity' (Class name: Session)
   - TenantConnectionService: 'src/tenants/database/tenant-connection.service'
   - Use absolute-like paths starting with 'src/' or correct relative paths.
9. KNOWN CLASS NAMES:
   - Use 'User', NOT 'UserEntity'.
   - Use 'Session', NOT 'SessionEntity'.
   - Use 'AuthService', NOT 'UserService'.
10. THE OUTPUT MUST START WITH 'import' AND END WITH '});'.`,
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
