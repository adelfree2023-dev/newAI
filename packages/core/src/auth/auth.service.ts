import { Injectable, Logger, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User } from './entities/user.entity';
import { Session } from './entities/session.entity';
import { UserService } from './services/user.service';
import { SessionService } from './services/session.service';
import { TwoFactorService } from './services/two-factor.service';
import { BruteForceProtectionService } from './services/brute-force-protection.service';
import { TenantContextService } from '../security/layers/s2-tenant-isolation/tenant-context.service';
import { AuditService } from '../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../security/layers/s7-encryption/encryption.service';
import { RateLimiterService } from '../security/layers/s6-rate-limiting/rate-limiter.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { Verify2FADto } from './dtos/verify-2fa.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly jwtExpiresInMonth: string;

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly twoFactorService: TwoFactorService,
        private readonly bruteForceService: BruteForceProtectionService,
        private readonly tenantContext: TenantContextService,
        private readonly auditService: AuditService,
        private readonly encryptionService: EncryptionService,
        private readonly rateLimiter: RateLimiterService
    ) {
        this.jwtExpiresInMonth = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    }

    async register(registerDto: RegisterDto): Promise<{ user: any; token: string }> {
        this.logger.log(`[M3] 📝 بدء تسجيل مستخدم جديد: ${registerDto.email}`);
        try {
            const existingUser = await this.userService.findByEmail(registerDto.email);
            if (existingUser) {
                throw new ConflictException('البريد الإلكتروني مستخدم مسبقاً');
            }
            const user = await this.userService.create({
                email: registerDto.email,
                passwordHash: registerDto.password,
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                role: registerDto.role || 'CUSTOMER' as any,
                tenantId: this.tenantContext.getTenantId() || null,
                emailVerified: false
            });
            const { accessToken } = await this.createSession(user);
            return { user: this.sanitizeUser(user), token: accessToken };
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل تسجيل المستخدم: ${error.message}`);
            throw error;
        }
    }

    async login(loginDto: LoginDto): Promise<any> {
        this.logger.log(`[M3] 🔐 محاولة تسجيل دخول: ${loginDto.email}`);
        const isLocked = await this.bruteForceService.isAccountLocked(loginDto.email);
        if (isLocked) throw new UnauthorizedException('الحساب مقفل مؤقتاً بسبب محاولات فاشلة متعددة (Account Locked)');

        const user = await this.userService.findByEmail(loginDto.email);
        if (!user || !(await user.validatePassword(loginDto.password))) {
            await this.bruteForceService.recordFailedAttempt(loginDto.email, 'login');
            throw new UnauthorizedException('بيانات الاعتماد غير صحيحة');
        }

        if (user.status !== 'ACTIVE') throw new UnauthorizedException('الحساب غير نشط');
        await this.bruteForceService.resetFailedAttempts(loginDto.email, 'login');

        if (user.isTwoFactorEnabled) {
            const verificationToken = await this.twoFactorService.generateVerificationToken(user);
            return { requires2FA: true, verificationToken, userId: user.id };
        }

        const { accessToken, refreshToken } = await this.createSession(user, loginDto.ipAddress, loginDto.userAgent);
        return {
            accessToken,
            refreshToken,
            user: {
                ...this.sanitizeUser(user),
                isSuperAdmin: user.isSuperAdmin()
            }
        };
    }

    async verify2FA(verifyDto: Verify2FADto): Promise<any> {
        const user = await this.userService.findById(verifyDto.userId);
        if (!user || !user.isTwoFactorEnabled) throw new UnauthorizedException('المصادقة الثنائية غير مطلوبة');
        const isValid = await this.twoFactorService.verifyToken(user, verifyDto.token);
        if (!isValid) throw new UnauthorizedException('رمز التحقق غير صحيح');
        return this.createSession(user);
    }

    async refreshToken(refreshToken: string): Promise<any> {
        const session = await this.sessionService.findByRefreshToken(refreshToken);
        if (!session || !session.isActive()) throw new UnauthorizedException('توكن غير صالح');
        const user = await this.userService.findById(session.userId);
        return this.createSession(user);
    }

    async logout(accessToken: string, refreshToken: string): Promise<void> {
        if (refreshToken) await this.sessionService.invalidateByRefreshToken(refreshToken);
        if (accessToken) {
            const payload = this.jwtService.decode(accessToken) as any;
            if (payload) await this.sessionService.invalidateAllUserSessions(payload.sub);
        }
    }

    async logoutAll(userId: string): Promise<void> {
        await this.sessionService.invalidateAllUserSessions(userId);
    }

    async enable2FA(userId: string): Promise<any> {
        const user = await this.userService.findById(userId);
        if (!user) throw new UnauthorizedException('المستخدم غير موجود');

        const { secret, qrCode } = await this.twoFactorService.enableTwoFactor(user);
        await this.userService.save(user);

        return {
            success: true,
            secret,
            qrCode
        };
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
        const user = await this.userService.findById(userId);
        if (!user || !(await user.validatePassword(changePasswordDto.currentPassword))) {
            throw new BadRequestException('كلمة المرور الحالية غير صحيحة');
        }
        user.passwordHash = changePasswordDto.newPassword;
        await this.userService.save(user);
        await this.sessionService.invalidateAllUserSessions(userId);
    }

    private async createSession(user: User, ipAddress?: string, userAgent?: string) {
        const refreshToken = uuidv4();
        const sessionId = uuidv4();

        const accessToken = this.jwtService.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenantId,
            isSuperAdmin: user.isSuperAdmin(),
            sid: sessionId // لضمان تفرد التوكن حتى لو تم تسجيل الدخول في نفس الثانية
        });

        await this.sessionService.create({
            userId: user.id,
            token: accessToken,
            refreshToken,
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            tenantId: user.tenantId
        });
        return { accessToken, refreshToken };
    }

    private sanitizeUser(user: User) {
        const { passwordHash, twoFactorSecret, ...sanitized } = user;
        return sanitized;
    }
}
