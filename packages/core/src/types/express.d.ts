import { User as UserEntity } from '@prisma/client';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';

declare global {
    namespace Express {
        interface User extends UserEntity { }
        interface Request {
            user?: User;
            tenantContext?: TenantContextService;
            requestId?: string;
        }
    }
}
