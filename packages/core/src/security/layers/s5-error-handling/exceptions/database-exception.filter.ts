import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { AuditService } from '../../s4-audit-logging/audit.service';
import { TenantContextService } from '../../s2-tenant-isolation/tenant-context.service';

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly tenantContext: TenantContextService
  ) { }

  catch(exception: QueryFailedError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = request['requestId'] || 'unknown';
    const tenantId = this.tenantContext.getTenantId() || 'system';

    // تحليل خطأ قاعدة البيانات
    const errorAnalysis = this.analyzeDatabaseError(exception, request, requestId, tenantId);

    // تسجيل الحدث الأمني
    this.auditService.logSecurityEvent('DATABASE_ERROR', {
      errorType: errorAnalysis.errorType,
      errorCode: errorAnalysis.errorCode,
      severity: errorAnalysis.severity,
      requestId,
      tenantId,
      details: errorAnalysis.details,
      timestamp: new Date().toISOString()
    });

    // تحديد استجابة المستخدم
    const userResponse = this.createUserResponse(errorAnalysis, exception);

    // تسجيل تفصيلي
    this.logDetailedError(errorAnalysis, exception);

    // إرسال الاستجابة
    response.status(errorAnalysis.statusCode).json(userResponse);
  }

  private analyzeDatabaseError(
    exception: QueryFailedError,
    request: Request,
    requestId: string,
    tenantId: string
  ) {
    // تحليل رمز الخطأ
    const errorCode = this.extractErrorCode(exception);
    const errorType = this.determineErrorType(errorCode, exception);
    const severity = this.assessSeverity(errorType, exception);
    const statusCode = this.mapStatusCode(errorType);

    return {
      errorCode,
      errorType,
      severity,
      statusCode,
      requestId,
      tenantId,
      details: {
        query: this.redactSensitiveData(exception.query),
        parameters: this.redactParameters(exception.parameters),
        driverError: exception.driverError?.message || exception.message,
        timestamp: new Date().toISOString(),
        ip: this.getClientIp(request),
        method: request.method,
        url: request.url
      }
    };
  }

  private extractErrorCode(exception: QueryFailedError): string {
    // استخراج رمز الخطأ من قاعدة البيانات
    if ((exception as any).driverError?.code) {
      return (exception as any).driverError.code;
    }

    if (exception['code']) {
      return exception['code'];
    }

    if (exception.message.includes('duplicate key')) {
      return 'ER_DUP_ENTRY';
    }

    if (exception.message.includes('violates foreign key constraint')) {
      return 'ER_FOREIGN_KEY_VIOLATION';
    }

    return 'UNKNOWN_DB_ERROR';
  }

  private determineErrorType(errorCode: string, exception: QueryFailedError): string {
    const errorPatterns = {
      'ER_DUP_ENTRY': 'DUPLICATE_ENTRY',
      '23505': 'DUPLICATE_ENTRY', // PostgreSQL duplicate key
      'ER_NO_SUCH_TABLE': 'MISSING_TABLE',
      '42P01': 'MISSING_TABLE', // PostgreSQL missing table
      'ER_FOREIGN_KEY_VIOLATION': 'FOREIGN_KEY_VIOLATION',
      '23503': 'FOREIGN_KEY_VIOLATION', // PostgreSQL foreign key
      'ER_LOCK_WAIT_TIMEOUT': 'LOCK_TIMEOUT',
      'ER_LOCK_DEADLOCK': 'DEADLOCK',
      'ER_DATA_TOO_LONG': 'DATA_OVERFLOW',
      '22001': 'DATA_OVERFLOW', // PostgreSQL string data right truncation
    };

    return errorPatterns[errorCode] || 'GENERAL_DATABASE_ERROR';
  }

  private assessSeverity(errorType: string, exception: QueryFailedError): string {
    const criticalErrors = ['MISSING_TABLE', 'ER_LOCK_DEADLOCK', 'DEADLOCK'];
    const highErrors = ['FOREIGN_KEY_VIOLATION', 'ER_LOCK_WAIT_TIMEOUT', 'LOCK_TIMEOUT'];
    const mediumErrors = ['DUPLICATE_ENTRY', 'DATA_OVERFLOW'];

    if (criticalErrors.includes(errorType)) return 'CRITICAL';
    if (highErrors.includes(errorType)) return 'HIGH';
    if (mediumErrors.includes(errorType)) return 'MEDIUM';

    return 'LOW';
  }

  private mapStatusCode(errorType: string): number {
    switch (errorType) {
      case 'DUPLICATE_ENTRY':
        return HttpStatus.CONFLICT;
      case 'MISSING_TABLE':
        return HttpStatus.SERVICE_UNAVAILABLE;
      case 'FOREIGN_KEY_VIOLATION':
        return HttpStatus.BAD_REQUEST;
      case 'LOCK_TIMEOUT':
      case 'DEADLOCK':
        return HttpStatus.SERVICE_UNAVAILABLE;
      case 'DATA_OVERFLOW':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private createUserResponse(errorAnalysis: any, exception: QueryFailedError) {
    const baseResponse = {
      statusCode: errorAnalysis.statusCode,
      timestamp: new Date().toISOString(),
      requestId: errorAnalysis.requestId
    };

    switch (errorAnalysis.errorType) {
      case 'DUPLICATE_ENTRY':
        return {
          ...baseResponse,
          message: 'البيانات التي تحاول حفظها موجودة مسبقاً في النظام.',
          errorType: 'DUPLICATE_ENTRY'
        };

      case 'MISSING_TABLE':
        return {
          ...baseResponse,
          message: 'نظام قاعدة البيانات يحتاج للصيانة. نعمل على حل المشكلة حالياً.',
          errorType: 'MISSING_TABLE'
        };

      case 'FOREIGN_KEY_VIOLATION':
        return {
          ...baseResponse,
          message: 'محاولة ربط بيانات غير موجودة. يرجى التحقق من صحة البيانات المدخلة.',
          errorType: 'FOREIGN_KEY_VIOLATION'
        };

      case 'LOCK_TIMEOUT':
      case 'DEADLOCK':
        return {
          ...baseResponse,
          message: 'نظام قاعدة البيانات مشغول حالياً. يرجى المحاولة مرة أخرى بعد قليل.',
          errorType: errorAnalysis.errorType
        };

      case 'DATA_OVERFLOW':
        return {
          ...baseResponse,
          message: 'البيانات المدخلة طويلة جداً. يرجى اختصارها وإعادة المحاولة.',
          errorType: 'DATA_OVERFLOW'
        };

      default:
        return {
          ...baseResponse,
          message: 'حدث خطأ في قاعدة البيانات. نحن نعمل على حل المشكلة حالياً.',
          errorType: 'GENERAL_DATABASE_ERROR'
        };
    }
  }

  private redactSensitiveData(query: string): string {
    if (!query || typeof query !== 'string') return '[INVALID_QUERY]';

    // إخفاء البيانات الحساسة في الاستعلام
    let redactedQuery = query;

    // إخفاء كلمات المرور
    redactedQuery = redactedQuery.replace(
      /password\s*=\s*['"][^'"]*['"]/gi,
      'password = \'[REDACTED]\''
    );

    // إخفاء المفاتيح والأسرار
    redactedQuery = redactedQuery.replace(
      /(api_key|secret|token|auth_token|refresh_token)\s*=\s*['"][^'"]*['"]/gi,
      '$1 = \'[REDACTED]\''
    );

    // إخفاء بيانات البطاقات الائتمانية
    redactedQuery = redactedQuery.replace(
      /(card_number|cvv|expiry_date)\s*=\s*['"][^'"]*['"]/gi,
      '$1 = \'[REDACTED]\''
    );

    // إخفاء بيانات شخصية
    redactedQuery = redactedQuery.replace(
      /(email)\s*=\s*['"][^'"]+@[^'"]+\.[^'"]+['"]/gi,
      '$1 = \'[REDACTED]\''
    );

    // قص الاستعلام الطويل جداً
    if (redactedQuery.length > 1000) {
      return redactedQuery.substring(0, 1000) + '... [TRUNCATED]';
    }

    return redactedQuery;
  }

  private redactParameters(parameters: any): any {
    if (!parameters) return null;

    const sensitiveFields = [
      'password', 'token', 'secret', 'apiKey', 'privateKey',
      'creditCard', 'cvv', 'cardNumber', 'ssn', 'socialSecurityNumber',
      'email', 'phone', 'mobile', 'iban', 'bankAccount'
    ];

    const redacted: any = {};

    for (const [key, value] of Object.entries(parameters)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        redacted[key] = value.substring(0, 100) + '... [TRUNCATED]';
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  private logDetailedError(errorAnalysis: any, exception: QueryFailedError) {
    const logMethod = errorAnalysis.severity === 'CRITICAL' || errorAnalysis.severity === 'HIGH'
      ? 'error'
      : 'warn';

    this.logger[logMethod](`[S5] خطأ قاعدة بيانات - النوع: ${errorAnalysis.errorType}, الحدة: ${errorAnalysis.severity}`);

    if (process.env.NODE_ENV !== 'production') {
      this.logger[logMethod](`التفاصيل التقنية: ${JSON.stringify({
        errorCode: errorAnalysis.errorCode,
        originalError: exception.message,
        driverError: exception.driverError?.message
      }, null, 2)}`);
    }

    this.logger[logMethod](`الاستعلام المعدّل: ${errorAnalysis.details.query}`);
    this.logger[logMethod](`السياق: ${JSON.stringify({
      tenantId: errorAnalysis.tenantId,
      requestId: errorAnalysis.requestId,
      ip: errorAnalysis.details.ip
    }, null, 2)}`);
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
    }
    return request.ip || request.connection.remoteAddress || 'unknown';
  }
}