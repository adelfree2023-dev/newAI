import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { TenantService } from '../tenants/tenant.service';
import { UserService } from '../auth/services/user.service';
import { QuickStartDto } from './dtos/quick-start.dto';
import { UserRole } from '../auth/entities/user.entity';

@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        private readonly tenantService: TenantService,
        private readonly userService: UserService,
    ) { }

    async checkDomainAvailability(domain: string): Promise<boolean> {
        const tenants = await this.tenantService.getAllActiveTenants();
        const exists = tenants.some(t => t.id === domain || t.domain === `${domain}.apex-platform.com`);
        return !exists;
    }

    async createStoreWithTemplate(dto: QuickStartDto) {
        this.logger.log(`🚀 بدء عملية الإنشاء السريع للمتجر: ${dto.storeName}`);

        // 1. التحقق من توفر النطاق (Tenant ID)
        const isAvailable = await this.checkDomainAvailability(dto.domain);
        if (!isAvailable) {
            throw new ConflictException('النطاق المطلوب محجوز بالفعل');
        }

        try {
            // 2. البحث عن المستخدم مسبقاً
            const existingUser = await this.userService.findByEmail(dto.email);

            // 3. إنشاء المستأجر (هذا ينشئ الـ Schema تلقائياً)
            const tenant = await this.tenantService.createTenant({
                id: dto.domain,
                name: dto.storeName,
                domain: `${dto.domain}.apex-platform.com`,
                businessType: dto.businessType,
                contactEmail: dto.email,
            });

            if (existingUser) {
                // تحديث المستخدم الحالي لربطه بالمتجر الجديد
                this.logger.log(`🔗 ربط المستخدم الموجود ${dto.email} بالمتجر الجديد: ${tenant.id}`);
                existingUser.tenantId = tenant.id;
                existingUser.role = UserRole.TENANT_ADMIN;
                await this.userService.save(existingUser);
            } else {
                // إنشاء مستخدم جديد
                await this.userService.create({
                    email: dto.email,
                    passwordHash: dto.password,
                    firstName: 'Store',
                    lastName: 'Owner',
                    role: UserRole.TENANT_ADMIN,
                    tenantId: tenant.id,
                    emailVerified: true,
                });
            }

            this.logger.log(`✅ تم إنشاء المتجر والمدير بنجاح لـ: ${dto.domain}`);

            return tenant;
        } catch (error) {
            this.logger.error(`❌ فشل الإنشاء السريع: ${error.message}`);
            throw error;
        }
    }
}
