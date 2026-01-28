import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { User } from '../entities/user.entity';
import { EncryptionService } from '../../security/layers/s7-encryption/encryption.service';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class TwoFactorService {
    private readonly logger = new Logger(TwoFactorService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly encryptionService: EncryptionService,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService
    ) { }

    async enableTwoFactor(user: User): Promise<{ secret: string; qrCode: string }> {
        this.logger.log(`[M3] 🔐 تفعيل المصادقة الثنائية للمستخدم: ${user.email}`);
        try {
            const secret = speakeasy.generateSecret({
                name: `${this.configService.get<string>('APP_NAME', 'Apex Platform')}: ${user.email}`,
                length: 32
            });
            const encryptedSecret = await this.encryptionService.encryptSensitiveData(secret.base32, '2fa_secret', user.tenantId);
            user.twoFactorSecret = encryptedSecret;
            user.isTwoFactorEnabled = true;
            await this.auditService.logSecurityEvent('2FA_ENABLED', {
                userId: user.id,
                email: user.email,
                tenantId: user.tenantId,
                timestamp: new Date().toISOString()
            });
            const qrCode = await QRCode.toDataURL(secret.otpauth_url);
            return { secret: secret.base32, qrCode };
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل تفعيل المصادقة الثنائية: ${error.message}`);
            throw error;
        }
    }

    async verifyToken(user: User, token: string): Promise<boolean> {
        try {
            if (!user.isTwoFactorEnabled || !user.twoFactorSecret) return false;
            const decryptedSecret = await this.encryptionService.decryptSensitiveData(user.twoFactorSecret, '2fa_secret', user.tenantId);
            return speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token,
                window: 2
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ خطأ في التحقق من رمز 2FA: ${error.message}`);
            return false;
        }
    }

    async generateVerificationToken(user: User): Promise<string> {
        try {
            const token = speakeasy.totp({
                secret: await this.encryptionService.decryptSensitiveData(user.twoFactorSecret, '2fa_secret', user.tenantId),
                encoding: 'base32',
                step: 300
            });
            return token;
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إنشاء رمز تحقق 2FA: ${error.message}`);
            throw error;
        }
    }
}
