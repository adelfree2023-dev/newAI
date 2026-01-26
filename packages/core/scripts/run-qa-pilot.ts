import { TestGenerationSkill } from '../src/security/ai-supervisor/skills/test-generation-skill';
import * as fs from 'fs';
import * as path from 'path';

async function runPilot() {
    console.log('🧪 [AI-QA] بدء تشغيل الوكيل التجريبي (Pilot Agent)...');

    const targetFile = 'src/tenants/tenant.service.ts';
    const fullPath = path.join(process.cwd(), targetFile);

    if (!fs.existsSync(fullPath)) {
        console.error(`❌ الملف غير موجود: ${fullPath}`);
        return;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const skill = new TestGenerationSkill();

    console.log(`🔍 [AI-QA] تحليل الملف: ${targetFile}`);
    const result = await skill.execute({
        filePath: targetFile,
        content: content,
        testFramework: 'Jest'
    });

    if (result.success && result.specContent) {
        const specPath = fullPath.replace('.ts', '.spec.ts');
        fs.writeFileSync(specPath, result.specContent);
        console.log(`✅ [AI-QA] نجح الوكيل في إنشاء ملف الاختبار: ${specPath}`);
        console.log('--- محتوى الملف المنشأ ---');
        console.log(result.specContent);
    } else {
        console.error('❌ [AI-QA] فشل الوكيل في إنشاء الاختبار');
    }
}

runPilot().catch(console.error);
