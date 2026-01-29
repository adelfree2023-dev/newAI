import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../../security/layers/s7-encryption/encryption.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class UserService {
    private readonly logger = new Logger('UserService');

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly auditService: AuditService,
        private readonly encryptionService: EncryptionService,
        private readonly tenantContext: TenantContextService
    ) { }

    async create(userData: Partial<User>): Promise<User> {
        const logger = this.logger || new Logger('UserService');
        logger.log(`[M3] 📝 إنشاء مستخدم جديد: ${userData.email}`);
        try {
            const existingUser = await this.findByEmail(userData.email);
            if (existingUser) {
                throw new BadRequestException('البريد الإلكتروني مستخدم مسبقاً');
            }
            const user = this.userRepository.create(userData);
            const savedUser = await this.userRepository.save(user);
            await this.auditService.logBusinessEvent('USER_CREATED', {
                userId: savedUser.id,
                email: savedUser.email,
                role: savedUser.role,
                tenantId: savedUser.tenantId,
                timestamp: new Date().toISOString()
            });
            return savedUser;
        } catch (error) {
            (this.logger || new Logger('UserService')).error(`[M3] ❌ فشل إنشاء المستخدم: ${error.message}`);
            throw error;
        }
    }

    async findByEmail(email: string): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { email },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    passwordHash: true,
                    role: true,
                    status: true,
                    tenantId: true,
                    isTwoFactorEnabled: true,
                    twoFactorSecret: true,
                    failedLoginAttempts: true,
                    lockedUntil: true,
                    lastLoginIp: true,
                    lastLoginAt: true,
                    emailVerified: true,
                    resetPasswordToken: true,
                    resetPasswordExpires: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
        } catch (error) {
            (this.logger || new Logger('UserService')).error(`[M3] ❌ فشل البحث عن المستخدم: ${error.message}`);
            throw error;
        }
    }

    async findById(id: string): Promise<User | null> {
        try {
            return await this.userRepository.findOne({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    passwordHash: true,
                    role: true,
                    status: true,
                    tenantId: true,
                    isTwoFactorEnabled: true,
                    twoFactorSecret: true,
                    failedLoginAttempts: true,
                    lockedUntil: true,
                    lastLoginIp: true,
                    lastLoginAt: true,
                    emailVerified: true,
                    resetPasswordToken: true,
                    resetPasswordExpires: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
        } catch (error) {
            (this.logger || new Logger('UserService')).error(`[M3] ❌ فشل البحث عن المستخدم: ${error.message}`);
            throw error;
        }
    }

    async save(user: User): Promise<User> {
        try {
            return await this.userRepository.save(user);
        } catch (error) {
            (this.logger || new Logger('UserService')).error(`[M3] ❌ فشل حفظ المستخدم: ${error.message}`);
            throw error;
        }
    }
}
