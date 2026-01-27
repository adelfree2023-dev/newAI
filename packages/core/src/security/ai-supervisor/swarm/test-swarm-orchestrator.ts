import { SmartTestGenerationAgent } from './agents/test-generation-agent';
import * as fs from 'fs';
import * as path from 'path';

/**
 * مدير سرب الوكلاء الذكيين
 * ينسق عمل الوكلاء بشكل متوازي
 */
export class TestSwarmOrchestrator {
    private agent = new SmartTestGenerationAgent();
    private targetDir = path.join(process.cwd(), 'src');
    private processed = 0;
    private failed = 0;

    async run() {
        console.log('🚀 [AI SWARM] إطلاق سرب الوكلاء الذكيين الحقيقيين...');
        console.log('🧠 وكلاء يستخدمون LLM لفهم الكود وكتابة اختبارات حقيقية');

        // الحصول على جميع الملفات القابلة للاختبار
        const files = this.getAllTestableFiles(this.targetDir);
        console.log(`📂 وجدت \${files.length} ملف للتحليل`);

        // تشغيل الوكلاء بشكل متوازي (دفعة بـ 5)
        await this.processFilesInBatches(files, 5);

        this.printSummary();
    }

    private async processFilesInBatches(files: string[], batchSize: number) {
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            console.log(`\n📦 معالجة الدفعة [\${Math.floor(i/batchSize) + 1}]...`);
            await Promise.all(batch.map(file => this.processFile(file)));
        }
    }

    private async processFile(filePath: string) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const baseName = path.basename(filePath);

            console.log(`   ⏳ جاري تحليل [\${baseName}] بواسطة الـ AI...`);

            const result = await this.agent.execute({
                filePath,
                content
            });

            if (result.success && result.specContent) {
                const specPath = filePath.replace(/\.ts$/, '.spec.ts');
                fs.writeFileSync(specPath, result.specContent, 'utf-8');
                this.processed++;
                console.log(`   ✅ تم بنجاح: [\${path.basename(specPath)}]`);
            } else {
                this.failed++;
                console.log(`   ❌ فشل في [\${baseName}]: \${result.error}`);
            }
        } catch (error: any) {
            this.failed++;
            console.log(`   ❌ خطأ تقني في [\${path.basename(filePath)}]: \${error.message}`);
        }
    }

    private getAllTestableFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
        const files = fs.readdirSync(dirPath);

        files.forEach(file => {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                this.getAllTestableFiles(fullPath, arrayOfFiles);
            } else if (
                (file.endsWith('.service.ts') || file.endsWith('.controller.ts')) &&
                !file.endsWith('.spec.ts')
            ) {
                arrayOfFiles.push(fullPath);
            }
        });

        return arrayOfFiles;
    }

    private printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 ملخص تنفيذ سرب الوكلاء الذكيين');
        console.log('='.repeat(60));
        console.log(`✅ ملفات ناجحة: \${this.processed}`);
        console.log(`❌ ملفات فاشلة: \${this.failed}`);
        console.log('='.repeat(60));
    }
}
