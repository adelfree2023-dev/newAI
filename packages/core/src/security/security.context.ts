import { Injectable, Logger, OnModuleInit, Optional, INestApplication } from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from './layers/s4-audit-logging/audit.service';
import { ApexConfigService } from './layers/s1-environment-verification/apex-config.service';

@Injectable()
export class SecurityContext implements OnModuleInit {
    private readonly logger = new Logger(SecurityContext.name);

    constructor(
        @Optional() private readonly auditService: AuditService,
        @Optional() private readonly configService: ApexConfigService
    ) { }

    onModuleInit() {
        if (!this.configService) {
            this.logger.warn('ConfigService not available in SecurityContext');
        }
    }

    logSecurityEvent(eventType: string, details: any) {
        if (this.auditService) {
            this.auditService.logSecurityEvent(eventType, details);
        } else {
            this.logger.warn(`[AUDIT_FALLBACK] Security Event: ${eventType} - ${JSON.stringify(details)}`);
        }
    }

    logCriticalSecurityEvent(eventType: string, details: any) {
        this.logSecurityEvent(`CRITICAL_${eventType}`, details);
    }

    captureException(error: Error, context?: any) {
        this.logSecurityEvent('EXCEPTION_CAUGHT', {
            message: error.message,
            stack: error.stack,
            ...context
        });
    }

    getIpFromRequest(req: Request): string {
        const forwardedFor = req.headers['x-forwarded-for'];
        if (forwardedFor) {
            return Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0].trim();
        }
        return req.ip || (req.socket as any)?.remoteAddress || 'unknown';
    }

    static validateEnvironment(config: any) {
        const isProd = config.get('NODE_ENV') === 'production';
        const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];

        for (const v of requiredVars) {
            const val = config.get(v);
            if (isProd && !val) {
                throw new Error(`CRITICAL: Missing environment variable ${v}`);
            }
        }

        if (isProd) {
            const jwtSecret = config.get('JWT_SECRET');
            if (jwtSecret && jwtSecret.length < 32) {
                throw new Error('JWT_SECRET is too short for production');
            }
        }
    }

    static async verifyDatabaseConnection(prisma: any, app: INestApplication) {
        try {
            await prisma.$queryRaw`SELECT 1`;
        } catch (error) {
            try {
                await prisma.$connect();
                await prisma.$queryRaw`SELECT 1`;
            } catch (e) {
                throw new Error('Database connection failed');
            }
        }
    }
}
