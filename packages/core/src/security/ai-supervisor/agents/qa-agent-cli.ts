import { QualityAssuranceAgent } from './qa-agent';
import { VercelAgentFactory } from '../vercel-integration/vercel-agent-factory';
import { AuditService } from '../../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../layers/s2-tenant-isolation/tenant-context.service';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrapQA() {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('❌ يرجى تحديد مسار الملف المطلوب توليد اختبار له.');
        process.exit(1);
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolutePath)) {
        console.error(`❌ الملف غير موجود: ${absolutePath}`);
        process.exit(1);
    }

    console.log(`🤖 [QA-CLI] جاري تحضير الوكيل لتوليد اختبار لـ: ${filePath}...`);

    // محاكاة سياق NestJS للتشغيل المستقل
    const mockRequest = { headers: {} } as any;
    const tenantContext = new TenantContextService(mockRequest);
    const auditService = new AuditService(mockRequest, tenantContext);
    const factory = new VercelAgentFactory(null as any); // سيستخدم مفاتيح البيئة مباشرة

    // تهيئة الوكيل
    const qaAgent = new QualityAssuranceAgent(factory as any, auditService);

    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const specContent = await qaAgent.generateSpecFile(filePath, fileContent);

    if (specContent) {
        const specPath = absolutePath.replace(/\.ts$/, '.test.ts');
        fs.writeFileSync(specPath, specContent);
        console.log(`✅ [QA-CLI] تم إنشاء ملف الاختبار بنجاح: ${specPath}`);
    } else {
        console.error('❌ [QA-CLI] فشل الوكيل في توليد ملف الاختبار.');
        process.exit(1);
    }
}

bootstrapQA().catch(err => {
    console.error('💥 خطأ كارثي في الوكيل:', err);
    process.exit(1);
});
