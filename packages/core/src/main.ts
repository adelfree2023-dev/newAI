import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';
import { EnvironmentValidatorService } from './security/layers/s1-environment-verification/environment-validator.service';
import { TenantConnectionService } from './tenants/database/tenant-connection.service';
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

    // S6: تحديد حدود المعدل
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'production' ? 100 : 500,
      standardHeaders: true,
      legacyHeaders: false
    });
    app.use(limiter);
    logger.log('✅ [S6] تم تفعيل تحديد حدود المعدل');

    // S3: التحقق من المدخلات
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    }));
    logger.log('✅ [S3] تم تفعيل التحقق من المدخلات');

    // S4: تسجيل التدقيق
    app.use(AuditLoggerMiddleware());
    logger.log('✅ [S4] تم تفعيل تسجيل التدقيق');

    // S5: معالجة الأخطاء
    app.useGlobalFilters(new AllExceptionsFilter());
    logger.log('✅ [S5] تم تفعيل معالجة الأخطاء الآمنة');

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

    // M2: تهيئة مخططات المستأجرين
    const schemaInitializer = app.get(SchemaInitializerService);
    await schemaInitializer.onModuleInit();

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