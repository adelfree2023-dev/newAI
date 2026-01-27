import { User as UserEntity } from '../auth/entities/user.entity';
import { TenantContextService } from './security/layers/s2-tenant-isolation/tenant-context.service';

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
