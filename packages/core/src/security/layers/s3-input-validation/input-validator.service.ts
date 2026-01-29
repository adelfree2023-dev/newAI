import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as z from 'zod';
import { AuditService } from '../../layers/s4-audit-logging/audit.service';

@Injectable()
export class InputValidatorService {
  private readonly logger = new Logger(InputValidatorService.name);

  constructor(private readonly auditService: AuditService) { }

  validate<T extends z.ZodTypeAny>(schema: T, data: unknown, context: string): z.infer<T> {
    try {
      this.logger.debug(`[S3] 🧪 التحقق من المدخلات للسياق: ${context}`);

      // تنفيذ التحقق باستخدام Zod
      const result = schema.safeParse(data);

      if (!result.success) {
        // تحويل أخطاء Zod إلى تنسيق مقروء
        const errorMessages = result.error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
          received: (err as any).input
        }));

        // تسجيل محاولة إدخال غير صالحة كحدث أمني
        this.logValidationFailure(context, data, errorMessages);

        this.logger.warn(`[S3] ❌ فشل التحقق من المدخلات للسياق: ${context}`);
        this.logger.warn(JSON.stringify(errorMessages, null, 2));

        throw new BadRequestException({
          message: 'مدخلات غير صالحة',
          context,
          errors: errorMessages
        });
      }

      this.logger.debug(`[S3] ✅ نجاح التحقق من المدخلات للسياق: ${context}`);
      return result.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // التعامل مع الأخطاء غير المتوقعة
      this.logger.error(`[S3] 🚨 خطأ غير متوقع في التحقق: ${context} - ${error.message}`);
      this.auditService.logSecurityEvent('VALIDATION_ERROR', {
        context,
        error: error.message,
        stack: error.stack
      });

      throw new BadRequestException('حدث خطأ أثناء التحقق من المدخلات');
    }
  }

  private logValidationFailure(context: string, rawData: unknown, errors: any[]) {
    // تسجيل الحدث الأمني
    this.auditService.logSecurityEvent('INVALID_INPUT_ATTEMPT', {
      context,
      rawData,
      errors,
      timestamp: new Date().toISOString()
    });

    // إذا كان هناك محاولات متكررة، يمكن اتخاذ إجراءات إضافية
    const isSuspicious = errors.some(err =>
      err.message.toLowerCase().includes('sql') ||
      err.message.toLowerCase().includes('script') ||
      err.path.includes('password') && err.received?.length > 100
    );

    if (isSuspicious) {
      this.logger.error(`[S3] 🔴 محاولة إدخال مشبوهة في السياق: ${context}`);
      // هنا يمكن إضافة حظر مؤقت أو إرسال تنبيه
    }
  }

  sanitizeInput(input: string | number | object | any[]): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  private sanitizeString(input: string): string {
    // إزالة أكواد JavaScript/HTML الخبيثة
    let sanitized = input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on[a-z]+=/gi, '');

    // منع حقن SQL
    sanitized = sanitized
      .replace(/(\b)(select|insert|update|delete|drop|union|exec|xp_cmdshell)(\b)/gi, '$1[PROTECTED]$3')
      .replace(/--/g, '[COMMENT]')
      .replace(/;/g, '[SEMICOLON]');

    // منع حقن NoSQL
    sanitized = sanitized.replace(/\$[a-z]+/g, '[NOSQL]');

    return sanitized;
  }

  async secureValidate(schema: any, data: any, context: string) { return this.validate(schema, data, context); }
  sanitize(data: any) { return this.sanitizeInput(data); }
}