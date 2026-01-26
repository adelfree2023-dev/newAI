import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as csurf from 'csurf';
import * as rateLimit from 'express-rate-limit';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';
import { TenantContextService } from './security/layers/s2-tenant-isolation/tenant-context.service';
import { AISecuritySupervisorService } from './security/ai-supervisor/ai-security-supervisor.service';
import { EnvironmentValidatorService } from './security/layers/s1-environment-verification/environment-validator.service';

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

    // S8: الحماية من هجمات الويب - المستوى الأول
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://*.apex-platform.com'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://*.apex-platform.com'],
          imgSrc: ["'self'", 'data:', 'https://*.apex-platform.com', 'https://*.stripe.com'],
          fontSrc: ["'self'", 'https://*.apex-platform.com'],
          connectSrc: ["'self'", 'https://*.apex-platform.com', 'wss://*.apex-platform.com'],
          frameSrc: ["'self'", 'https://*.stripe.com'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
        reportOnly: process.env.NODE_ENV === 'development'
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    logger.log('✅ [S8] تم تفعيل رؤوس الأمان HTTP');

    // S6: تحديد حدود المعدل الأساسي
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: process.env.NODE_ENV === 'production' ? 100 : 500, // حدود مرنة للتطوير
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn(`[S6] 🚨 تجاوز حد المعدل من IP: ${req.ip}`);

        // الحصول على سياق المستأجر لإرسال تنبيه مخصص
        const tenantContext = app.get(TenantContextService);
        const tenantId = tenantContext.getTenantId() || 'unknown';

        // تسجيل الحدث الأمني
        const auditService = app.get(AuditLoggerMiddleware);
        // سيتم تنفيذ التسجيل الفعلي لاحقاً

        res.status(429).json({
          statusCode: 429,
          message: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.',
          retryAfter: 15,
          timestamp: new Date().toISOString()
        });
      }
    });

    app.use(limiter);
    logger.log('✅ [S6] تم تفعيل تحديد حدود المعدل الأساسي');

    // S3: التحقق من المدخلات العالمي
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      exceptionFactory: (errors) => {
        logger.error(`[S3] 🚨 مدخلات غير صالحة: ${JSON.stringify(errors)}`);

        // تسجيل محاولة اختراق محتملة
        const errorMessages = errors.map(err => ({
          property: err.property,
          constraints: err.constraints,
          value: err.value
        }));

        // سيتم تحسين هذا مع خدمة السجل الكاملة
        return {
          statusCode: 400,
          message: 'مدخلات غير صالحة',
          errors: errorMessages
        };
      }
    }));

    logger.log('✅ [S3] تم تفعيل التحقق من المدخلات العالمي');

    // S4: وسطاء تسجيل التدقيق
    app.use(AuditLoggerMiddleware());
    logger.log('✅ [S4] تم تفعيل تسجيل التدقيق');

    // S5: معالجة الأخطاء الآمنة
    app.useGlobalFilters(new AllExceptionsFilter());
    logger.log('✅ [S5] تم تفعيل معالجة الأخطاء الآمنة');

    // CORS Configuration
    const corsOrigin = process.env.CORS_ORIGIN || 'https://apex-platform.com';
    app.enableCors({
      origin: corsOrigin.split(','),
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      credentials: true,
      maxAge: 3600,
      preflightContinue: false,
    });

    logger.log(`✅ تم تفعيل CORS للمنشأ: ${corsOrigin}`);

    // Swagger Configuration (للتطوير فقط)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Apex Platform API')
        .setDescription('وثائق واجهة برمجة تطبيقات منصة Apex')
        .setVersion('1.0')
        .addTag('security')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api-docs', app, document);

      logger.log('✅ تم تفعيل وثائق API للتطوير');
    }

    // المنفذ من المتغيرات البيئية
    const port = process.env.PORT || 3000;

    // S8: حماية إضافية ضد CSRF
    if (process.env.NODE_ENV === 'production') {
      app.use(csurf({
        cookie: {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 3600
        }
      }));
      logger.log('✅ [S8] تم تفعيل حماية CSRF للإنتاج (ASMP Compliance)');
    }

    // بدء الخادم
    await app.listen(port);

    // S7: بعد بدء الخادم، فحص التشفير
    const encryptionService = app.get(AISecuritySupervisorService);
    // سيتم تنفيذ فحص التشفير الفعلي لاحقاً

    logger.log(`🚀 [SUCCEED] تم تشغيل الخادم بنجاح على المنفذ ${port}`);
    logger.log(`🌐 العنوان: http://localhost:${port}`);
    logger.log(`🔧 البيئة: ${process.env.NODE_ENV || 'development'}`);

    // بدء المشرف الأمني بالذكاء الاصطناعي
    await app.get(AISecuritySupervisorService).onModuleInit();
    logger.log('🧠 بدء المشرف الأمني بالذكاء الاصطناعي');

    // إرسال تنبيه بدء التشغيل الناجح
    const auditService = app.get(AuditLoggerMiddleware);
    // سيتم تنفيذ الإرسال الفعلي لاحقاً

  } catch (error) {
    logger.error('❌ [CRITICAL] فشل تشغيل التطبيق:');
    logger.error(error.message);
    logger.error(error.stack);

    // في حالة الفشل الحرجة، إنهاء العملية
    if (error.message.includes('ENCRYPTION_MASTER_KEY') ||
      error.message.includes('JWT_SECRET') ||
      error.message.includes('DATABASE_URL')) {
      logger.error('🔒 النظام سيرفض التشغيل بسبب متغيرات بيئية مفقودة');
      process.exit(1);
    }

    // محاولة إعادة التشغيل
    logger.warn('🔄 محاولة إعادة التشغيل بعد 5 ثوانٍ...');
    setTimeout(() => {
      bootstrap().catch(restartError => {
        logger.error('❌ فشل إعادة التشغيل النهائي');
        process.exit(1);
      });
    }, 5000);
  }
}

// معالجة الأحداث الحرجة
process.on('unhandledRejection', (reason, promise) => {
  const logger = new Logger('CriticalErrorHandler');
  logger.error('🚨 [CRITICAL] وعد غير معالج:');
  logger.error(reason);

  // لا يتم إنهاء العملية فوراً، بل محاولة الاسترداد
  // سيتم تنفيذ آلية الاسترداد المتقدمة لاحقاً
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('CriticalErrorHandler');
  logger.error('🔥 [CRITICAL] استثناء غير معالج:');
  logger.error(error.message);
  logger.error(error.stack);

  // إرسال تنبيه فوري للأمان
  // سيتم تنفيذ الإرسال الفعلي لاحقاً

  // إنهاء العملية بعد التسجيل
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

bootstrap();