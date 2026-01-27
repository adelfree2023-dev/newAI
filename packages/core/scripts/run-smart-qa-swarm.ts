import { TestSwarmOrchestrator } from '../src/security/ai-supervisor/swarm/test-swarm-orchestrator';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

async function main() {
    // التحقق من وجود مفتاح API
    if (!process.env.GROQ_API_KEY) {
        console.error('❌ خطأ: GROQ_API_KEY غير مضبوط في ملف .env');
        // process.exit(1); // سنحاول الاستمرار إذا كان المفتاح موجوداً في البيئة
    }

    const orchestrator = new TestSwarmOrchestrator();
    await orchestrator.run();
}

main().catch(console.error);
