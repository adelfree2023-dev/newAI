import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { User, UserRole, UserStatus } from '@prisma/client';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../../security/layers/s7-encryption/encryption.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
    private readonly logger = new Logger('UserService');

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly encryptionService: EncryptionService,
        private readonly tenantContext: TenantContextService
    ) { }

    async create(userData: Partial<User>): Promise<any> {
        this.logger.log(`[M3] 📝 إنشاء مستخدم جديد: ${userData.email}`);
        try {
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new BadRequestException('البريد الإلكتروني مستخدم مسبقاً');
            }

            // Prisma requires concrete data for create
            const user = await this.prisma.user.create({
                data: {
                    email: userData.email,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    passwordHash: userData.passwordHash,
                    role: userData.role as any,
                    status: userData.status as any,
                    tenantId: userData.tenantId,
                    emailVerified: userData.emailVerified || false,
                }
            });

            await this.auditService.logBusinessEvent('USER_CREATED', {
                userId: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                timestamp: new Date().toISOString()
            });
            return user;
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إنشاء المستخدم: ${error.message}`);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<any | null> {
        try {
            return await this.prisma.user.findUnique({
                where: { email },
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل البحث عن المستخدم: ${error.message}`);
            throw error;
        }
    }

    async findById(id: string): Promise<any | null> {
        try {
            return await this.prisma.user.findUnique({
                where: { id },
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل البحث عن المستخدم: ${error.message}`);
            throw error;
        }
    }

    async save(user: any): Promise<any> {
        try {
            const { id, ...data } = user;
            return await this.prisma.user.update({
                where: { id },
                data: data
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل حفظ المستخدم: ${error.message}`);
            throw error;
        }
    }
}
