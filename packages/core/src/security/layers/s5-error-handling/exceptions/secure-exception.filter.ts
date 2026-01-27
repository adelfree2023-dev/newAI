import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger, Scope, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from '../../s4-audit-logging/audit.service';
import { TenantContextService } from '../../s2-tenant-isolation/tenant-context.service';

@Injectable({ scope: Scope.REQUEST })
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) { }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = (request as any).requestId || uuidv4();
    const timestamp = new Date().toISOString();

    // تحديد نوع الاستثناء
    const errorType = this.getErrorType(exception);
    const statusCode = this.getStatusCode(exception);
    const isProduction = process.env.NODE_ENV === 'production';

    // تحليل الإستثناء وتسجيله
    const errorDetails = this.analyzeError(exception, request, requestId, isProduction);

    // تسجيل الحدث الأمني
    this.logSecurityEvent(errorType, errorDetails, statusCode);

    // رد آمن للمستخدم
    const safeResponse = this.createSafeResponse(exception, errorDetails, statusCode, isProduction);

    // إرسال الرد
    response.status(statusCode).json(safeResponse);

    // تسجيل تفصيلي في وحدة التحكم
    this.logDetailedError(exception, errorDetails, statusCode);
  }

  private getErrorType(exception: any): string {
    if (exception instanceof HttpException) {
      return 'HTTP_EXCEPTION';
    } else if (exception.code && exception.code.startsWith('E')) {
      return 'DATABASE_ERROR';
    } else if (exception.name === 'ValidationError') {
      return 'VALIDATION_ERROR';
    } else if (exception.name === 'JsonWebTokenError') {
      return 'AUTHENTICATION_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  private getStatusCode(exception: any): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    } else if (exception.code === 'ER_DUP_ENTRY' || exception.code === '23505') {
      return HttpStatus.CONFLICT;
    } else if (exception.code === 'ER_NO_SUCH_TABLE' || exception.code === '42P01') {
      return HttpStatus.BAD_REQUEST;
    } else if (exception instanceof SyntaxError) {
      return HttpStatus.BAD_REQUEST;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private analyzeError(exception: any, request: Request, requestId: string, isProduction: boolean) {
    const tenantId = this.tenantContext.getTenantId() || 'system';
    const userId = (request as any).user?.id || 'anonymous';

    // تحليل تفصيلي للخطأ
    let technicalDetails = {};
    let sensitiveData = {};

    if (!isProduction) {
      technicalDetails = {
        stack: exception.stack?.split('\n').slice(0, 10),
        name: exception.name,
        message: exception.message
      };
    }

    // تحليل الأخطاء الخاصة بقاعدة البيانات
    if (exception.code) {
      sensitiveData = {
        databaseErrorCode: exception.code,
        databaseErrorDetail: exception.detail,
        databaseErrorHint: exception.hint
      };

      this.logger.warn(`[S5] خطأ في قاعدة البيانات: ${exception.code} - ${exception.message}`);
    }

    // تحليل الأخطاء الخاصة بالمدخلات
    if (exception.name === 'ValidationError' || exception.name === 'ZodError') {
      sensitiveData = {
        validationErrors: exception.errors || exception.issues
      };

      this.logger.warn(`[S5] خطأ في التحقق من المدخلات: ${JSON.stringify((sensitiveData as any).validationErrors)}`);
    }

    return {
      requestId,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip: this.getClientIp(request),
      userAgent: request.get('User-Agent'),
      tenantId,
      userId,
      technicalDetails: isProduction ? {} : technicalDetails,
      sensitiveData: this.redactSensitiveData(sensitiveData),
      errorType: this.getErrorType(exception),
      databaseError: exception.code ? true : false,
      originalError: exception.message
    };
  }

  private createSafeResponse(exception: any, errorDetails: any, statusCode: number, isProduction: boolean) {
    const baseResponse = {
      statusCode,
      timestamp: errorDetails.timestamp,
      path: errorDetails.path,
      requestId: errorDetails.requestId
    };

    // رسائل مخصصة لأنواع معينة من الأخطاء
    if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        ...baseResponse,
        message: isProduction
          ? 'حدث خطأ داخلي في الخادم. تم تسجيل المشكلة وسنقوم بإصلاحها قريباً.'
          : exception.message
      };
    } else if (statusCode === HttpStatus.UNAUTHORIZED) {
      return {
        ...baseResponse,
        message: 'غير مصرح به. يرجى تسجيل الدخول أولاً.'
      };
    } else if (statusCode === HttpStatus.FORBIDDEN) {
      return {
        ...baseResponse,
        message: 'وصول مرفوض. ليس لديك الصلاحيات الكافية لهذا الإجراء.'
      };
    } else if (statusCode === HttpStatus.NOT_FOUND) {
      return {
        ...baseResponse,
        message: 'الموارد المطلوبة غير موجودة.'
      };
    } else if (statusCode === HttpStatus.CONFLICT) {
      return {
        ...baseResponse,
        message: 'تعارض في البيانات. قد تكون تحاول إنشاء عنصر موجود مسبقاً.'
      };
    }

    // الاستجابة العامة
    return {
      ...baseResponse,
      message: isProduction
        ? 'تعذر إتمام الطلب. يرجى المحاولة لاحقاً.'
        : exception.message || 'خطأ غير معروف'
    };
  }

  private logSecurityEvent(errorType: string, errorDetails: any, statusCode: number) {
    // تحديد مستوى الخطورة
    let severity = 'LOW';
    if (statusCode >= 500) severity = 'MEDIUM';
    if (errorDetails.databaseError) severity = 'HIGH';
    if (errorDetails.errorType === 'AUTHENTICATION_ERROR' && statusCode === 401) severity = 'MEDIUM';
    if (errorDetails.errorType === 'UNAUTHORIZED_ACCESS_ATTEMPT') severity = 'CRITICAL';

    // تسجيل الحدث الأمني
    this.auditService.logSecurityEvent('ERROR_OCCURRENCE', {
      errorType,
      statusCode,
      severity,
      details: errorDetails,
      timestamp: new Date().toISOString()
    });

    // إرسال تنبيه مباشر للأخطاء الحرجة
    if (severity === 'CRITICAL' || severity === 'HIGH') {
      this.sendImmediateAlert(errorType, errorDetails, severity);
    }
  }

  private sendImmediateAlert(errorType: string, errorDetails: any, severity: string) {
    // تنفيذ إرسال التنبيهات للأمان (سيتم تطويره لاحقاً)
    this.logger.error(`[S5] 🚨 تنبيه فوري - خطأ ${severity}: ${errorType}`);
    this.logger.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      errorType,
      severity,
      details: errorDetails
    }, null, 2));

    // هنا يمكن إضافة إرسال إشعارات للمشرفين عبر البريد أو SMS
  }

  private logDetailedError(exception: any, errorDetails: any, statusCode: number) {
    const logLevel = statusCode >= 500 ? 'error' : 'warn';

    this.logger[logLevel](`[S5] خطأ مفصل - النوع: ${errorDetails.errorType}, الرمز: ${statusCode}`);

    // في مرحلة التطوير الحالية، سنظهر التفاصيل حتى في الإنتاج للتشخيص
    this.logger[logLevel](`التفاصيل التقنية: ${JSON.stringify({
      name: exception.name,
      message: exception.message,
      stack: exception.stack?.split('\n').slice(0, 10)
    }, null, 2)}`);

    this.logger[logLevel](`سياق الطلب: ${JSON.stringify({
      requestId: errorDetails.requestId,
      tenantId: errorDetails.tenantId,
      userId: errorDetails.userId,
      ip: errorDetails.ip,
      path: errorDetails.path,
      method: errorDetails.method
    }, null, 2)}`);
  }

  private redactSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitivePatterns = [
      'password', 'token', 'secret', 'key', 'auth', 'credential', 'credit', 'card', 'cvv',
      'social', 'security', 'ssn', 'iban', 'bank', 'account'
    ];

    const redacted = { ...data };

    for (const key of Object.keys(redacted)) {
      const lowerKey = key.toLowerCase();

      if (sensitivePatterns.some(pattern => lowerKey.includes(pattern))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactSensitiveData(redacted[key]);
      }
    }

    return redacted;
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    }
    return request.ip || request.connection.remoteAddress || 'unknown';
  }
}