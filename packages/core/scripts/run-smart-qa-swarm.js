const { generateText } = require('ai');
const { groq } = require('@ai-sdk/groq');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SmartTestGenerationAgent {
    async execute(input) {
        try {
            const fileName = path.basename(input.filePath);
            const { text } = await generateText({
                model: groq('llama-3.3-70b-versatile'),
                system: `أنت مطور QA برتبة (Staff Engineer) متخصص في NestJS و Jest.
        المهمة: كتابة اختبارات منطقية وعميقة (Deep Testing).
        القواعد:
        - استخدم Jest و TestingModule.
        - استخدم Proxy-based Mocks لكل التبعيات.
        - هدفك هو تغطية 95% من الكود.`,
                prompt: `حلل الكود لملف [\${fileName}]: \n\n \`\`\`typescript\n\${input.content}\n\`\`\``,
            });
            return { success: true, specContent: this.extractCodeBlock(text) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    extractCodeBlock(response) {
        const match = response.match(/```(?:typescript|ts)?\s*\n([\s\S]*?)\n```/);
        return match ? match[1].trim() : response.trim();
    }
}

async function runSwarm() {
    const agent = new SmartTestGenerationAgent();
    const targetDir = path.join(process.cwd(), 'src');

    function getAllFiles(dir, files = []) {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                getAllFiles(fullPath, files);
            } else if ((file.endsWith('.service.ts') || file.endsWith('.controller.ts')) && !file.endsWith('.spec.ts')) {
                files.push(fullPath);
            }
        });
        return files;
    }

    console.log('🚀 [SMART AI SWARM] Launching Groq Agents...');
    const files = getAllFiles(targetDir);

    for (const file of files) {
        console.log(`⏳ Processing \${path.basename(file)}...`);
        const content = fs.readFileSync(file, 'utf-8');
        const result = await agent.execute({ filePath: file, content });
        if (result.success) {
            fs.writeFileSync(file.replace('.ts', '.spec.ts'), result.specContent);
            console.log('✅ Done.');
        } else {
            console.log('❌ Failed: ' + result.error);
        }
    }
}

runSwarm().catch(console.error);
