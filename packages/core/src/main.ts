import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { EnvironmentValidatorService } from './security/layers/s1-environment-verification/environment-validator.service';
import { SchemaInitializerService } from './tenants/database/schema-initializer.service';

async function bootstrap() {
  const logger = new Logger('MainApplication');

  try {
    // S1: التحقق من البيئة قبل أي شيء
    logger.log('🚀 [S1] بدء التحقق من البيئة والأمان...');
    const environmentValidator = new EnvironmentValidatorService();
    await environmentValidator.onModuleInit();
    logger.log('✅ [S1] اجتازت البيئة جميع اختبارات الأمان');

    // إنشاء التطبيق
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug']
    });

    // S8: الحماية من هجمات الويب
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://*.apex-platform.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://*.apex-platform.com'],
          imgSrc: ["'self'", 'data:', 'https://*.apex-platform.com'],
          fontSrc: ["'self'", 'https://*.apex-platform.com'],
          connectSrc: ["'self'", 'https://*.apex-platform.com', 'wss://*.apex-platform.com'],
          frameSrc: ["'self'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
        reportOnly: process.env.NODE_ENV === 'development'
      }
    }));
    logger.log('✅ [S8] تم تفعيل رؤوس الأمان HTTP');

    // S6: تحديد حدود المعدل (Rate Limiting)
    const isBenchmarkMode = process.env.BENCHMARK_MODE === 'true';
    // نسمح بطلبات إنشاء المستأجرين (Tenants) لتسهيل الـ Benchmark
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: isBenchmarkMode ? 10000 : (process.env.NODE_ENV === 'production' ? 100 : 1000),
      standardHeaders: true,
      legacyHeaders: false,
      // استثناء ذكي: تخطي الحد إذا كان الطلب إنشاء مستأجر جديد
      skip: (req, res) => {
        if (isBenchmarkMode && req.path === '/api/tenants' && req.method === 'POST') {
          return true;
        }
        return false;
      },
      handler: (req, res, next, options) => {
        const rateLimitLogger = new Logger('RateLimit');
        rateLimitLogger.warn(`[S6] 🚨 تجاوز حد المعدل من IP: ${req.ip}`);
        res.status(429).json({
          statusCode: 429,
          message: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.',
          retryAfter: Math.ceil(options.windowMs / 1000),
          timestamp: new Date().toISOString()
        });
      }
    });
    app.use(limiter);
    logger.log(`✅ [S6] تم تفعيل تحديد حدود المعدل ${isBenchmarkMode ? '(وضع الاختبار)' : '(الوضع العادي)'}`);

    // S3: التحقق من المدخلات
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));
    logger.log('✅ [S3] تم تفعيل التحقق من المدخلات');

    // ملاحظة: تم نقل S4 (AuditLogger) و S5 (ExceptionFilter) إلى AppModule 
    // لضمان التعامل الصحيح مع التبعات (Dependencies)

    // تهيئة CORS
    app.enableCors({
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true
    });

    // المنفذ
    const port = process.env.PORT || 3000;

    // بدء الخادم
    await app.listen(port);

    // M2: تهيئة مخططات المستأجرين (تتم تلقائياً عبر Lifecycle Hooks)
    logger.log(`🚀 [SUCCEED] تم تشغيل الخادم بنجاح على المنفذ ${port}`);
    logger.log(`🌐 العنوان: http://localhost:${port}`);
    logger.log(`🔧 البيئة: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`✅ [M2] نظام المستأجرين جاهز`);

  } catch (error) {
    logger.error('❌ [CRITICAL] فشل تشغيل التطبيق:');
    logger.error(error.message);
    logger.error(error.stack);

    if (error.message.includes('ENCRYPTION_MASTER_KEY') ||
      error.message.includes('JWT_SECRET') ||
      error.message.includes('DATABASE_URL')) {
      logger.error('🔒 النظام سيرفض التشغيل بسبب متغيرات بيئية مفقودة');
      process.exit(1);
    }

    process.exit(1);
  }
}

// معالجة الأحداث الحرجة
process.on('unhandledRejection', (reason) => {
  console.error('🚨 [CRITICAL] وعد غير معالج:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('🔥 [CRITICAL] استثناء غير معالج:', error);
  process.exit(1);
});

bootstrap();