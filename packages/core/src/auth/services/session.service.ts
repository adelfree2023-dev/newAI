import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService
    ) { }

    async create(sessionData: any): Promise<any> {
        this.logger.debug(`[M3] 📝 إنشاء جلسة جديدة للمستخدم: ${sessionData.userId}`);
        try {
            const expiresAt = sessionData.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            const session = await this.prisma.session.create({
                data: {
                    userId: sessionData.userId,
                    token: sessionData.token,
                    refreshToken: sessionData.refreshToken,
                    ipAddress: sessionData.ipAddress,
                    userAgent: sessionData.userAgent,
                    tenantId: sessionData.tenantId,
                    expiresAt: expiresAt,
                }
            });

            await this.auditService.logBusinessEvent('SESSION_CREATED', {
                sessionId: session.id,
                userId: session.userId,
                ipAddress: session.ipAddress,
                tenantId: session.tenantId,
                expiresAt: session.expiresAt,
                timestamp: new Date().toISOString()
            });
            return session;
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إنشاء الجلسة: ${error.message}`);
            throw error;
        }
    }

    async findByRefreshToken(refreshToken: string): Promise<any | null> {
        try {
            const session = await this.prisma.session.findUnique({
                where: { refreshToken },
                include: { user: true }
            });

            if (session && (session.isInvalidated || session.expiresAt < new Date())) {
                this.logger.warn(`[M3] ⚠️ محاولة استخدام جلسة منتهية الصلاحية`);
                return null;
            }
            return session;
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل البحث عن الجلسة: ${error.message}`);
            throw error;
        }
    }

    async invalidateAllUserSessions(userId: string): Promise<void> {
        try {
            const result = await this.prisma.session.updateMany({
                where: { userId, isInvalidated: false },
                data: {
                    isInvalidated: true,
                    invalidatedAt: new Date()
                }
            });

            await this.auditService.logSecurityEvent('ALL_SESSIONS_INVALIDATED', {
                userId,
                sessionCount: result.count,
                reason: 'PASSWORD_CHANGE',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إبطال جميع الجلسات: ${error.message}`);
            throw error;
        }
    }

    async invalidateByRefreshToken(refreshToken: string): Promise<void> {
        try {
            await this.prisma.session.updateMany({
                where: { refreshToken },
                data: {
                    isInvalidated: true,
                    invalidatedAt: new Date()
                }
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إبطال الجلسة: ${error.message}`);
            throw error;
        }
    }

    async save(session: any): Promise<any> {
        try {
            const { id, user, ...data } = session;
            return await this.prisma.session.update({
                where: { id },
                data: data
            });
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل حفظ الجلسة: ${error.message}`);
            throw error;
        }
    }
}
