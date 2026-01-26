import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantIsolationInterceptor implements NestInterceptor {
    private readonly logger = new Logger(TenantIsolationInterceptor.name);

    constructor(private readonly tenantContext: TenantContextService) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const request = context.switchToHttp().getRequest();
        const url = request.url;

        // استثناء مسارات النظام والإدارة يدوياً لضمان استقرار التشغيل
        if (url.includes('/api/tenants') || url.includes('/health')) {
            this.logger.debug(`[S2] 🛡️ وكيل العزل: تجاوز مسار نظام: ${url}`);
            return next.handle();
        }

        const tenantId = this.tenantContext.getTenantId();

        // إذا لم يكن مسار نظام ولم نجد معرف مستأجر، نرفض لضمان العزل
        if (!tenantId && !this.tenantContext.isSystemContext()) {
            this.logger.error(`[S2] 🚨 وكيل العزل: الوصول لمسار حساس ${url} بدون معرف مستأجر!`);
            throw new ForbiddenException('يجب تحديد معرف المستأجر للوصول لهذه الموارد');
        }

        this.logger.debug(`[S2] 🛡️ وكيل العزل: تم تأمين الطلب للمستأجر: ${tenantId}`);
        return next.handle();
    }
}
