import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class BruteForceProtectionService implements OnModuleInit {
    private readonly logger = new Logger(BruteForceProtectionService.name);
    private redisClient: RedisClientType;
    private isConnected: boolean = false;

    constructor(
        private readonly configService: ConfigService
    ) { }

    async onModuleInit() {
        try {
            const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
            this.redisClient = createClient({ url: redisUrl });

            this.redisClient.on('error', (err) => {
                this.logger.error(`[S6] 🔴 Redis Error: ${err.message}`);
                this.isConnected = false;
            });

            await this.redisClient.connect();
            await this.redisClient.ping();

            this.isConnected = true;
            this.logger.log('✅ [S6] Redis connected successfully for brute force protection');
        } catch (error) {
            this.logger.error(`[S6] 🔴 Failed to connect to Redis: ${error.message}`);
            this.logger.error('⚠️ Brute force protection will be DISABLED');
            this.isConnected = false;
        }
    }

    private async ensureConnection(): Promise<boolean> {
        if (this.isConnected) return true;
        try {
            await this.redisClient.connect();
            this.isConnected = true;
            return true;
        } catch (error) {
            return false;
        }
    }

    async recordFailedAttempt(
        email: string,
        ip: string,
        context: string = 'login'
    ): Promise<{ locked: boolean; attempts: number }> {
        const canProceed = await this.ensureConnection();
        if (!canProceed) {
            this.logger.warn(`[S6] 🛡️ Redis unavailable, skipping limit check for ${email}`);
            return { locked: false, attempts: 0 };
        }

        try {
            const env = this.configService.get<string>('NODE_ENV', 'development');

            // Use global key for login to prevent bypass via tenant header manipulation
            const emailKey = `brute_force:${env}:${context}:global:${email}`;
            const ipKey = `brute_force:${env}:${context}:ip:${ip}`;

            const emailCount = await this.redisClient.incr(emailKey);
            const ipCount = await this.redisClient.incr(ipKey);

            await this.redisClient.expire(emailKey, 15 * 60);
            await this.redisClient.expire(ipKey, 15 * 60);

            this.logger.warn(`[S6] 🔐 Failed attempt ${emailCount}/5 for ${email}`);

            const maxAttempts = 5;
            const locked = emailCount >= maxAttempts;

            if (locked) {
                this.logger.error(`[S6] 🔒 Account locked: ${email} (${emailCount} attempts)`);
            }

            return { locked, attempts: emailCount };
        } catch (error) {
            this.logger.error(`[S6] ❌ Error recording failed attempt: ${error.message}`);
            return { locked: false, attempts: 0 };
        }
    }

    async resetFailedAttempts(email: string, context: string = 'login'): Promise<void> {
        const canProceed = await this.ensureConnection();
        if (!canProceed) return;

        try {
            const env = this.configService.get<string>('NODE_ENV', 'development');
            // Remove tenantId from key to make it globally consistent or use 'system' for login
            const emailKey = `brute_force:${env}:${context}:global:${email}`;

            await this.redisClient.del(emailKey);
            this.logger.log(`[S6] ✅ Failed attempts reset for ${email}`);
        } catch (error) {
            this.logger.error(`[S6] ❌ Error resetting failed attempts: ${error.message}`);
        }
    }

    async isAccountLocked(email: string, context: string = 'login'): Promise<boolean> {
        const canProceed = await this.ensureConnection();
        if (!canProceed) return false;

        try {
            const env = this.configService.get<string>('NODE_ENV', 'development');

            const emailKey = `brute_force:${env}:${context}:global:${email}`;
            const attempts = await this.redisClient.get(emailKey);
            const attemptsStr = attempts ? String(attempts) : '0';

            return parseInt(attemptsStr, 10) >= 5;
        } catch (error) {
            this.logger.error(`[S6] ❌ Error checking account lock: ${error.message}`);
            return false;
        }
    }

    /**
     * ✅ [M4] حظر عنوان IP بناءً على طلب من خدمة الاستجابة التلقائية
     */
    async blockIpAddress(ip: string, reason: string, durationMinutes: number = 60): Promise<void> {
        const canProceed = await this.ensureConnection();
        if (!canProceed) return;

        try {
            const env = this.configService.get<string>('NODE_ENV', 'development');
            const blockKey = `brute_force:${env}:blocked_ip:${ip}`;

            await this.redisClient.set(blockKey, JSON.stringify({
                reason,
                blockedAt: new Date().toISOString(),
                durationMinutes
            }), {
                EX: durationMinutes * 60
            });

            this.logger.error(`[M4] 🚫 IP Blocked: ${ip} for ${durationMinutes}m. Reason: ${reason}`);
        } catch (error) {
            this.logger.error(`[M4] ❌ Error blocking IP address: ${error.message}`);
        }
    }

    /**
     * ✅ التحقق مما إذا كان العنوان محظوراً
     */
    async isIpBlocked(ip: string): Promise<boolean> {
        const canProceed = await this.ensureConnection();
        if (!canProceed) return false;

        try {
            const env = this.configService.get<string>('NODE_ENV', 'development');
            const blockKey = `brute_force:${env}:blocked_ip:${ip}`;
            const isBlocked = await this.redisClient.exists(blockKey);
            return isBlocked === 1;
        } catch (error) {
            this.logger.error(`[S6] ❌ Error checking IP block: ${error.message}`);
            return false;
        }
    }
}
