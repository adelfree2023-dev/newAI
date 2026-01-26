import { TestGenerationSkill } from '../src/security/ai-supervisor/skills/test-generation-skill';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const CONCURRENCY_LIMIT = 10;
const SRC_DIR = path.join(process.cwd(), 'src');

async function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.module.ts') && !file.endsWith('.dto.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

async function runSwarm() {
    console.log('🚀 [AI QA Swarm] إطلاق جيش الـ 10 وكلاء لتغطية المشروع...');

    const allFiles = await getAllFiles(SRC_DIR);
    console.log(`📂 تم العثور على ${allFiles.length} ملف برمجي يحتاج لاختبار.`);

    const skill = new TestGenerationSkill();
    let completedCount = 0;

    const chunks = [];
    for (let i = 0; i < allFiles.length; i += CONCURRENCY_LIMIT) {
        chunks.push(allFiles.slice(i, i + CONCURRENCY_LIMIT));
    }

    for (const chunk of chunks) {
        console.log(`⚡ معالجة دفعة جديدة (${chunk.length} ملفات بالتوازي)...`);

        await Promise.all(chunk.map(async (filePath) => {
            const relativePath = path.relative(process.cwd(), filePath);
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const result = await skill.execute({
                    filePath: relativePath,
                    content: content,
                    testFramework: 'Jest'
                });

                if (result.success && result.specContent) {
                    const specPath = filePath.replace('.ts', '.spec.ts');
                    fs.writeFileSync(specPath, result.specContent);
                    completedCount++;
                }
            } catch (err) {
                console.error(`❌ فشل في معالجة ${relativePath}: ${err.message}`);
            }
        }));
    }

    console.log(`✅ [AI QA Swarm] اكتملت المهمة! تم إنشاء ${completedCount} ملف اختبار.`);
    console.log(`📊 التغطية التقريبية المستهدفة لجميع الملفات: 95%+`);
}

runSwarm().catch(console.error);
