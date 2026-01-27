import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class BruteForceProtectionService {
    private readonly logger = new Logger(BruteForceProtectionService.name);
    private redisClient: Redis;

    constructor(
        @Inject(REQUEST) private readonly request: Request,
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService
    ) {
        this.initializeRedis();
    }

    private initializeRedis() {
        try {
            const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
            this.redisClient = new Redis(redisUrl);

            this.redisClient.on('error', (error) => {
                this.logger.error(`[M3] ❌ خطأ في اتصال Redis: ${error.message}`);
            });

            this.logger.log('[M3] ✅ تم تهيئة خدمة الحماية من هجمات القوة الغاشمة');
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل تهيئة Redis: ${error.message}`);
            // لا نعطل النظام بالكامل إذا تعطل Redis، لكننا نسجل ذلك
        }
    }

    async recordFailedAttempt(email: string, context: string = 'login'): Promise<void> {
        if (!this.redisClient) return;

        const ip = this.getClientIp();
        const tenantId = this.tenantContext.getTenantId() || 'system';

        const emailKey = `auth:failed:${context}:${tenantId}:${email}`;
        const ipKey = `auth:failed:${context}:${ip}`;

        const emailCount = await this.redisClient.incr(emailKey);
        const ipCount = await this.redisClient.incr(ipKey);

        this.logger.debug(`[M3] محاولة فاشلة: ${email} (العدد: ${emailCount}/5) من IP: ${ip} (العدد: ${ipCount}/20)`);

        await this.redisClient.expire(emailKey, 15 * 60);
        await this.redisClient.expire(ipKey, 15 * 60);

        await this.auditService.logSecurityEvent('FAILED_LOGIN_ATTEMPT', {
            email,
            ip,
            tenantId,
            context,
            emailCount,
            ipCount,
            timestamp: new Date().toISOString()
        });

        if (emailCount >= 5) {
            this.logger.warn(`[M3] 🔒 قفل الحساب بسبب محاولات فاشلة: ${email}`);
            await this.auditService.logSecurityEvent('ACCOUNT_LOCKED_BRUTE_FORCE', {
                email,
                ip,
                tenantId,
                failedAttempts: emailCount,
                lockedForMinutes: 15,
                timestamp: new Date().toISOString()
            });
        }

        if (ipCount >= 20) {
            await this.blockIpAddress(ip, 'BRUTE_FORCE_ATTEMPTS', 30);
        }
    }

    async isAccountLocked(email: string, context: string = 'login'): Promise<boolean> {
        if (!this.redisClient) return false;

        const tenantId = this.tenantContext.getTenantId() || 'system';
        const key = `auth:failed:${context}:${tenantId}:${email}`;

        const count = await this.redisClient.get(key);
        return count ? parseInt(count) >= 5 : false;
    }

    async resetFailedAttempts(email: string, context: string = 'login'): Promise<void> {
        if (!this.redisClient) return;

        const tenantId = this.tenantContext.getTenantId() || 'system';
        const key = `auth:failed:${context}:${tenantId}:${email}`;
        await this.redisClient.del(key);

        await this.auditService.logSecurityEvent('FAILED_ATTEMPTS_RESET', {
            email,
            tenantId,
            context,
            timestamp: new Date().toISOString()
        });
    }

    async blockIpAddress(ip: string, reason: string, durationMinutes: number): Promise<void> {
        if (!this.redisClient) return;

        const blockKey = `security:blocked_ip:${ip}`;
        const blockData = {
            reason,
            blockedAt: new Date().toISOString(),
            duration: durationMinutes * 60,
            blockedBy: 'BRUTE_FORCE_PROTECTION'
        };

        await this.redisClient.setex(blockKey, durationMinutes * 60, JSON.stringify(blockData));

        await this.auditService.logSecurityEvent('IP_BLOCKED', {
            ip,
            reason,
            duration: `${durationMinutes} minutes`,
            timestamp: new Date().toISOString()
        });

        this.logger.warn(`[M3] 🚫 تم حظر IP: ${ip} لمدة ${durationMinutes} دقيقة - السبب: ${reason}`);
    }

    async isIpBlocked(ip: string): Promise<boolean> {
        if (!this.redisClient) return false;

        const blockKey = `security:blocked_ip:${ip}`;
        const blockData = await this.redisClient.get(blockKey);
        return !!blockData;
    }

    private getClientIp(): string {
        const forwardedFor = this.request.headers['x-forwarded-for'];
        if (forwardedFor) {
            return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
        }
        return this.request.ip || this.request.connection?.remoteAddress || 'unknown';
    }
}
