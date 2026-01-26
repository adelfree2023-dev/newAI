import { Logger } from '@nestjs/common';
import { apexAgent } from './apex-agent';

async function runAgent() {
  const logger = new Logger('ApexAgentRunner');
  
  logger.log('🚀 بدء تشغيل Apex Agent خارج سياق التطبيق...');
  
  try {
    // التحقق من المتغيرات البيئية الأساسية
    const requiredVars = ['ENCRYPTION_MASTER_KEY', 'DATABASE_URL'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      logger.error(`❌ متغيرات بيئية مفقودة: ${missingVars.join(', ')}`);
      logger.error('⚠️ سيعمل Apex Agent في وضع التحقق المحدود');
    }

    const result = await apexAgent.activate();
    
    if (result.success) {
      logger.log('✅ نجاح فحص صحة النظام:');
      logger.log(`   • التقرير: ${result.reportPath}`);
      logger.log(`   • الأخطاء الحرجة: ${result.criticalIssues || 0}`);
      logger.log(`   • التوصيات: ${result.recommendations?.length || 0}`);
    } else {
      logger.error('❌ فشل في فحص صحة النظام');
      if (result.errors) {
        result.errors.forEach(error => logger.error(`   • ${error}`));
      }
      process.exit(1);
    }
    
    // التحقق من وجود أخطاء حرجة
    if (result.criticalIssues > 0) {
      logger.error(`🚨 ${result.criticalIssues} أخطاء حرجة تحتاج لإصلاح قبل التشغيل`);
      process.exit(1);
    }
    
    logger.log('✅ النظام جاهز للتشغيل الآمن');
    process.exit(0);
  } catch (err) {
    logger.error('❌ خطأ في تشغيل Apex Agent:');
    logger.error(err instanceof Error ? err.message : String(err));
    if (err.stack) logger.error(err.stack);
    process.exit(1);
  }
}

// التشغيل مع معالجة الإشارات
process.on('SIGINT', () => {
  console.log('\n🛑 توقف Apex Agent بناءً على طلب المستخدم');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 إشارة إنهاء مستلمة - إنهاء Apex Agent');
  process.exit(0);
});

runAgent();
