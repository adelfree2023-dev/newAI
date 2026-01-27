import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

class SmartTestGenerationAgent {
    async execute(input) {
        try {
            const fileName = path.basename(input.filePath);
            const { text } = await generateText({
                model: groq('llama-3.3-70b-versatile'),
                system: "أنت مطور QA برتبة (Staff Engineer) متخصص في NestJS و Jest. المهمة: كتابة اختبارات منطقية وعميقة. الهدف: تغطية 95% من السطور والحالات. القواعد: استخدم Jest و TestingModule، استخدم Proxy Mocks للتبعيات، أضف Success/Error cases.",
                prompt: "حلل الكود لملف [" + fileName + "] وأنشئ ملف اختبار .spec.ts احترافي: \n\n ```typescript\n" + input.content + "\n```",
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
    const targetDir = path.join(projectRoot, 'src');

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

    console.log('🚀 [ELITE AI SWARM] Launching Groq + Llama 3.3 Agents...');
    const files = getAllFiles(targetDir);
    console.log('📂 Found ' + files.length + ' files. Starting parallel processing...');

    await Promise.all(files.map(async (file) => {
        const fileName = path.basename(file);
        try {
            const content = fs.readFileSync(file, 'utf-8');
            const result = await agent.execute({ filePath: file, content });
            if (result.success) {
                fs.writeFileSync(file.replace('.ts', '.spec.ts'), result.specContent);
                console.log('✅ ' + fileName + ' -> Spec Created.');
            } else {
                console.error('❌ ' + fileName + ' -> Failed: ' + result.error);
            }
        } catch (err) {
            console.error('❌ ' + fileName + ' -> Error: ' + err.message);
        }
    }));

    console.log('\n🏁 Mission Accomplished. Every file captured. 🛡️');
}

runSwarm().catch(console.error);
