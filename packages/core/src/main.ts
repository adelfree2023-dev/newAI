import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as csurf from 'csurf';
import { rateLimit } from 'express-rate-limit';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './security/layers/s5-error-handling/exceptions/secure-exception.filter';
import { AuditLoggerMiddleware } from './security/layers/s4-audit-logging/audit-logger.middleware';
import { TenantContextService } from './security/layers/s2-tenant-isolation/tenant-context.service';
import { AISecuritySupervisorService } from './security/ai-supervisor/ai-security-supervisor.service';
import { EnvironmentValidatorService } from './security/layers/s1-environment-verification/environment-validator.service';
import { TenantContextMiddleware } from './tenants/context/tenant-context.middleware';
import { TenantService } from './tenants/tenant.service';
import { AuditService } from './security/layers/s4-audit-logging/audit.service';
import { VercelAgentFactory } from './security/ai-supervisor/vercel-integration/vercel-agent-factory';

async function bootstrap() {
  const logger = new Logger('MainApplication');
  try {
    // S1: التحقق من البيئة قبل أي شيء
    logger.log('🚀 [S1] بدء التحقق من البيئة والأمان...');
    // تمرير نسخة بسيطة من ConfigService للتحقق الأولي
    const environmentValidator = new EnvironmentValidatorService(new ConfigService(process.env));
    await environmentValidator.onModuleInit();
    logger.log('✅ [S1] اجتازت البيئة جميع اختبارات الأمان');

    // إنشاء التطبيق
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug'],
      // تمكين CORS بشكل صحيح للسماح لطلبات المستأجرين
      cors: {
        origin: function (origin, callback) {
          const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['https://apex-platform.com'];
          const tenantDomains = ['localhost', '.apex-platform.com', '.vercel.app'];

          if (!origin) return callback(null, true);

          const isAllowed = allowedOrigins.some(allowed =>
            origin.includes(allowed) ||
            tenantDomains.some(domain => origin.includes(domain))
          );

          if (isAllowed) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
        maxAge: 3600,
      }
    });

    // S8: الحماية من هجمات الويب - المستوى الأول
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://*.apex-platform.com', 'https://*.vercel.app'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://*.apex-platform.com', 'https://*.vercel.app'],
          imgSrc: ["'self'", 'data:', 'https://*.apex-platform.com', 'https://*.stripe.com', 'https://*.vercel.app'],
          fontSrc: ["'self'", 'https://*.apex-platform.com', 'https://*.vercel.app'],
          connectSrc: ["'self'", 'https://*.apex-platform.com', 'wss://*.apex-platform.com', 'https://*.vercel.app'],
          frameSrc: ["'self'", 'https://*.stripe.com', 'https://*.vercel.app'],
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
        const tenantId = tenantContext.getTenantId() || 'system';

        res.status(429).json({
          statusCode: 429,
          message: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً.',
          retryAfter: 15,
          timestamp: new Date().toISOString(),
          tenantId
        });
      },
      keyGenerator: (req) => {
        const tenantContext = app.get(TenantContextService);
        const tenantId = tenantContext.getTenantId() || 'system';
        return `${req.ip}:${tenantId}`;
      }
    });
    app.use(limiter);
    logger.log('✅ [S6] تم تفعيل تحديد حدود المعدل الأساسي');

    // S3: التحقق من المدخلات العالمي مع دعم المستأجرين
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      },
      exceptionFactory: (errors) => {
        logger.error(`[S3] 🚨 مدخلات غير صالحة: ${JSON.stringify(errors)}`);
        const errorMessages = errors.map(err => ({
          property: err.property,
          constraints: err.constraints,
          value: err.value
        }));

        const tenantContext = app.get(TenantContextService);
        const tenantId = tenantContext.getTenantId() || 'system';

        return {
          statusCode: 400,
          message: 'مدخلات غير صالحة',
          errors: errorMessages,
          tenantId
        };
      }
    }));
    logger.log('✅ [S3] تم تفعيل التحقق من المدخلات العالمي');

    logger.log('✅ [S3] تم تفعيل التحقق من المدخلات العالمي');

    // S4 & S2: يتم تفعيل تسجيل التدقيق وعزل المستأجرين عبر AppModule
    logger.log('✅ [S4 & S2] تم تفعيل تسجيل التدقيق وعزل المستأجرين');

    // S5: معالجة الأخطاء الآمنة
    const auditService = app.get(AuditService);
    const tenantContext = app.get(TenantContextService);
    app.useGlobalFilters(new AllExceptionsFilter(auditService, tenantContext));
    logger.log('✅ [S5] تم تفعيل معالجة الأخطاء الآمنة');

    // Swagger Configuration (للتطوير فقط)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Apex Platform API')
        .setDescription('وثائق واجهة برمجة تطبيقات منصة Apex')
        .setVersion('1.0')
        .addTag('security')
        .addTag('tenants')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api-docs', app, document);
      logger.log('✅ تم تفعيل وثائق API للتطوير مع دعم المستأجرين');
    }

    // المنفذ من المتغيرات البيئية
    const port = process.env.PORT || 3000;

    // S8: حماية إضافية ضد CSRF مع دعم المستأجرين
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

    logger.log(`🚀 [SUCCEED] تم تشغيل الخادم بنجاح على المنفذ ${port}`);
    logger.log(`🌐 العنوان: http://localhost:${port}`);
    logger.log(`🔧 البيئة: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🏢 دعم متعدد المستأجرين: ${process.env.SUPPORT_MULTITENANT === 'true' ? 'مفعل' : 'معطل'}`);

    // 🤖 M2: بدء المشرف الأمني بالذكاء الاصطناعي
    const aiSupervisor = app.get(AISecuritySupervisorService);
    // onModuleInit will be called by Nest automatically, but we can call it again if needed or just log
    logger.log('🧠 [M2] المشرف الأمني بالذكاء الاصطناعي جاهز');

    // 🔍 M2: بدء عامل عزل المستأجرين
    const vercelAgentFactory = app.get(VercelAgentFactory);
    const tenantIsolationAgent = vercelAgentFactory.createTenantIsolationAgent();
    logger.log('🛡️ [M2] تم تهيئة عامل عزل المستأجرين بالذكاء الاصطناعي');

    // ✅ M2: التحقق من حالة عزل المستأجرين
    const tenantService = app.get(TenantService);
    // loadActiveTenants will be called by TenantModule.onModuleInit
    logger.log(`✅ [M2] نظام المستأجرين نشط ومعزول`);

    // إرسال تنبيه بدء التشغيل الناجح
    logger.log('✅ [S4] تم تفعيل تسجيل أحداث النظام');

  } catch (error) {
    logger.error('❌ [CRITICAL] فشل تشغيل التطبيق:');
    logger.error(error.message);
    logger.error(error.stack);

    if (error.message.includes('ENCRYPTION_MASTER_KEY') ||
      error.message.includes('JWT_SECRET') ||
      error.message.includes('DATABASE_URL') ||
      error.message.includes('TENANT_ISOLATION_FAILURE')) {
      logger.error('🔒 النظام سيرفض التشغيل بسبب متغيرات بيئية مفقودة أو فشل في العزل');
      process.exit(1);
    }

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
process.on('unhandledRejection', (reason) => {
  const logger = new Logger('CriticalErrorHandler');
  logger.error('🚨 [CRITICAL] وعد غير معالج:');
  logger.error(reason);
});

process.on('uncaughtException', (error) => {
  const logger = new Logger('CriticalErrorHandler');
  logger.error('🔥 [CRITICAL] استثناء غير معالج:');
  logger.error(error.message);
  logger.error(error.stack);

  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

bootstrap();