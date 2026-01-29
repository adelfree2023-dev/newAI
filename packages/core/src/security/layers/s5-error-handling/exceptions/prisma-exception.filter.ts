import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuditService } from '../../s4-audit-logging/audit.service';
import { TenantContextService } from '../../s2-tenant-isolation/tenant-context.service';

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientUnknownRequestError, Prisma.PrismaClientRustPanicError, Prisma.PrismaClientInitializationError, Prisma.PrismaClientValidationError)
export class PrismaExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(PrismaExceptionFilter.name);

    constructor(
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService
    ) { }

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>();
        const response = ctx.getResponse<Response>();

        const requestId = request['requestId'] || 'unknown';
        const tenantId = this.tenantContext.getTenantId() || 'system';

        let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'حدث خطأ في قاعدة البيانات';
        let errorType = 'PRISMA_ERROR';

        if (exception instanceof Prisma.PrismaClientKnownRequestError) {
            switch (exception.code) {
                case 'P2002': // Unique constraint violation
                    statusCode = HttpStatus.CONFLICT;
                    message = 'البيانات التي تحاول حفظها موجودة مسبقاً (Unique Constraint violation)';
                    errorType = 'DUPLICATE_ENTRY';
                    break;
                case 'P2003': // Foreign key constraint violation
                    statusCode = HttpStatus.BAD_REQUEST;
                    message = 'محاولة ربط بيانات غير موجودة (Foreign key violation)';
                    errorType = 'FOREIGN_KEY_VIOLATION';
                    break;
                case 'P2025': // Record not found
                    statusCode = HttpStatus.NOT_FOUND;
                    message = 'السجل المطلوب غير موجود';
                    errorType = 'RECORD_NOT_FOUND';
                    break;
                default:
                    message = `خطأ قاعدة بيانات: ${exception.code}`;
            }
        }

        // تسجيل الحدث الأمني
        this.auditService.logSecurityEvent('DATABASE_ERROR', {
            errorType,
            errorCode: exception.code || 'UNKNOWN',
            requestId,
            tenantId,
            details: {
                message: exception.message,
                path: request.url,
                method: request.method
            },
            timestamp: new Date().toISOString()
        });

        this.logger.error(`[S5] ${errorType} [${exception.code || 'N/A'}]: ${exception.message}`);

        response.status(statusCode).json({
            statusCode,
            message,
            errorType,
            requestId,
            timestamp: new Date().toISOString()
        });
    }
}
