import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { EnvValidatorService } from './security/layers/s1-environment-verification/env-validator.service';
import { ApexConfigService } from './security/layers/s1-environment-verification/apex-config.service';
import { SecurityContext } from './security/security.context';
import { SchemaInitializerService } from './tenants/database/schema-initializer.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('MainApplication');

  try {
    // S1: التحقق من البيئة قبل أي شيء
    logger.log('🚀 [S1] بدء التحقق من البيئة والأمان...');

    // استخدام المكونات بشكل مستقل قبل بناء التطبيق
    const apexConfig = new ApexConfigService();
    const securityContext = new SecurityContext(null as any, apexConfig);
    const environmentValidator = new EnvValidatorService(apexConfig, securityContext);

    await environmentValidator.onModuleInit();
    logger.log('✅ [S1] اجتازت البيئة جميع اختبارات الأمان');

    // إنشاء التطبيق
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug']
    });

    // تعيين البادئة العالمية للـ API
    app.setGlobalPrefix('api');

    // S8: الحماية من هجمات الويب - تعديل للسماح بـ Swagger
    app.use(helmet({
      contentSecurityPolicy: false, // تعطيل مؤقت للـ CSP للتأكد من عمل الواجهة
    }));
    logger.log('✅ [S8] تم تفعيل رؤوس الأمان HTTP (CSP disabled for Swagger)');

    // S6: تحديد حدود المعدل (Rate Limiting)
    const isBenchmarkMode = process.env.BENCHMARK_MODE === 'true';
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isBenchmarkMode ? 10000 : (process.env.NODE_ENV === 'production' ? 100 : 1000),
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req, res) => {
        // تخطي الحماية لطلبات الـ Docs والـ Onboarding لتسهيل التجربة
        if (req.path.includes('/api/docs') || req.path.includes('/api/onboarding')) {
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
    logger.log(`✅ [S6] تم تفعيل تحديد حدود المعدل`);

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
      origin: true, // السماح بكل المصادر مؤقتاً للتجربة
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true
    });

    // Swagger UI Configuration
    const config = new DocumentBuilder()
      .setTitle('Apex Multi-tenant Platform API')
      .setDescription('نظام إدارة التجارة الإلكترونية متعدد المستأجرين - Apex 2026')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    // نستخدم 'docs' فقط لأن السيرفر يضيف 'api' تلقائياً كبادئة (Global Prefix)
    SwaggerModule.setup('docs', app, document);
    logger.log('✅ [Swagger] Documentation enabled at /api/docs');

    // المنفذ
    const port = process.env.PORT || 3001;

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