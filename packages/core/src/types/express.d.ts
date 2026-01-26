import { TenantContextService } from './security/layers/s2-tenant-isolation/tenant-context.service';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email?: string;
                role?: string;
                [key: string]: any;
            };
            tenantContext?: TenantContextService;
            requestId?: string;
        }
    }
}
