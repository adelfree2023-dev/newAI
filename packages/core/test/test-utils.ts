import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../src/security/layers/s4-audit-logging/audit.service';
import { TenantConnectionService } from '../src/tenants/database/tenant-connection.service';
import { SchemaInitializerService } from '../src/tenants/database/schema-initializer.service';
import { TenantContextService } from '../src/security/layers/s2-tenant-isolation/tenant-context.service';
import { REQUEST } from '@nestjs/core';

export const createMockPrisma = () => ({
    tenant: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    $executeRawUnsafe: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
});

export const createMockSecurityContext = () => ({
    getTenantId: jest.fn(() => 'test-tenant-id'),
    getTenantSchema: jest.fn(() => 'test_schema'),
    setTenantId: jest.fn(),
    isSystemContext: jest.fn(() => false),
    validateTenantAccess: jest.fn(() => true),
    logSecurityIncident: jest.fn(),
});

export const createMockRateLimiter = () => ({
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 10, reset: 1000 }),
    consume: jest.fn().mockResolvedValue({ allowed: true }),
});

export const createMockAnomalyDetection = () => ({
    inspect: jest.fn(),
    inspectFailedEvent: jest.fn(),
    inspectFailedLogin: jest.fn(),
    isThrottled: jest.fn(() => false),
    isSuspended: jest.fn(() => false),
    getStatus: jest.fn(() => ({ suspicious: false })),
});

export const createMockInputValidator = () => ({
    secureValidate: jest.fn().mockImplementation((schema, data) => data),
    sanitize: jest.fn().mockImplementation(data => data),
});

export const createMockCache = () => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    reset: jest.fn(),
});

export const createMockMail = () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
});

export const getCommonProviders = (additionalProviders: any[] = []): Provider[] => {
    const providers: Provider[] = [
        {
            provide: ConfigService,
            useValue: {
                get: jest.fn((key: string) => {
                    if (key === 'JWT_SECRET') return 'test-secret';
                    if (key === 'DATABASE_URL') return 'postgresql://user:pass@localhost:5432/db';
                    return null;
                }),
            },
        },
        {
            provide: JwtService,
            useValue: {
                sign: jest.fn(() => 'test-token'),
                verify: jest.fn(() => ({})),
            },
        },
        {
            provide: REQUEST,
            useValue: {
                method: 'GET',
                url: '/',
                headers: { 'user-agent': 'test-agent' },
                get: jest.fn().mockReturnValue('test-agent'),
            },
        },
        {
            provide: TenantContextService,
            useValue: createMockTenantContext(),
        },
        {
            provide: AuditService,
            useValue: createMockAudit(),
        },
        {
            provide: TenantConnectionService,
            useValue: {
                getSchemaName: jest.fn((id: string) => `tenant_${id}`),
                executeInTenantContext: jest.fn((id, cb) => cb(null)),
            },
        },
        {
            provide: SchemaInitializerService,
            useValue: {
                initializeNewTenant: jest.fn().mockResolvedValue(undefined),
            },
        },
    ];

    return providers.filter(p => !additionalProviders.some(ap => {
        const providerToken = (p as any).provide;
        const additionalToken = typeof ap === 'function' ? ap : ap.provide;
        return providerToken === additionalToken;
    }));
};

export const commonProviders = getCommonProviders;
