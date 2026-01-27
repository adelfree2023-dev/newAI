import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../../security/layers/s2-tenant-isolation/tenant-context.service';

@Injectable()
export class SessionService {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService
    ) { }

    async create(sessionData: Partial<Session>): Promise<Session> {
        this.logger.debug(`[M3] 📝 إنشاء جلسة جديدة للمستخدم: ${sessionData.userId}`);
        try {
            const session = this.sessionRepository.create(sessionData);
            const savedSession = await this.sessionRepository.save(session);
            await this.auditService.logBusinessEvent('SESSION_CREATED', {
                sessionId: savedSession.id,
                userId: savedSession.userId,
                ipAddress: savedSession.ipAddress,
                tenantId: savedSession.tenantId,
                expiresAt: savedSession.expiresAt,
                timestamp: new Date().toISOString()
            });
            return savedSession;
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إنشاء الجلسة: ${error.message}`);
            throw error;
        }
    }

    async findByRefreshToken(refreshToken: string): Promise<Session | null> {
        try {
            const session = await this.sessionRepository.findOne({
                where: { refreshToken },
                relations: ['user']
            });
            if (session && !session.isActive()) {
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
            const sessions = await this.sessionRepository.find({
                where: { userId, isInvalidated: false }
            });
            for (const session of sessions) {
                session.invalidate();
            }
            await this.sessionRepository.save(sessions);
            await this.auditService.logSecurityEvent('ALL_SESSIONS_INVALIDATED', {
                userId,
                sessionCount: sessions.length,
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
            const session = await this.findByRefreshToken(refreshToken);
            if (session) {
                session.invalidate();
                await this.sessionRepository.save(session);
            }
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل إبطال الجلسة: ${error.message}`);
            throw error;
        }
    }

    async save(session: Session): Promise<Session> {
        try {
            return await this.sessionRepository.save(session);
        } catch (error) {
            this.logger.error(`[M3] ❌ فشل حفظ الجلسة: ${error.message}`);
            throw error;
        }
    }
}
