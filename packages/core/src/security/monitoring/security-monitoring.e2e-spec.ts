import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SecurityMonitoringService } from './security-monitoring.service';
import { AnomalyAnalyzerService } from './anomaly-analyzer.service';
import { AutomatedResponseService } from '../response/automated-response.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { BruteForceProtectionService } from '../../auth/services/brute-force-protection.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';

describe('Security Monitoring E2E Tests', () => {
    let app: INestApplication;
    let monitoringService: SecurityMonitoringService;
    let anomalyAnalyzer: AnomalyAnalyzerService;
    let automatedResponse: AutomatedResponseService;

    const mockAuditService = {
        logSecurityEvent: jest.fn(),
        logSystemEvent: jest.fn(),
        queryAuditLogs: jest.fn()
    };

    const mockBruteForceProtection = {
        blockIpAddress: jest.fn(),
        isAccountLocked: jest.fn()
    };

    const mockTenantContext = {
        getTenantId: jest.fn()
    };

    const mockEncryptionService = {
        encryptSensitiveData: jest.fn(),
        decryptSensitiveData: jest.fn()
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [ConfigModule.forRoot({ isGlobal: true })],
            providers: [
                SecurityMonitoringService,
                AnomalyAnalyzerService,
                AutomatedResponseService,
                { provide: AuditService, useValue: mockAuditService },
                { provide: BruteForceProtectionService, useValue: mockBruteForceProtection },
                { provide: TenantContextService, useValue: mockTenantContext },
                { provide: EncryptionService, useValue: mockEncryptionService }
            ]
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        monitoringService = moduleFixture.get<SecurityMonitoringService>(SecurityMonitoringService);
        anomalyAnalyzer = moduleFixture.get<AnomalyAnalyzerService>(AnomalyAnalyzerService);
        automatedResponse = moduleFixture.get<AutomatedResponseService>(AutomatedResponseService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Security Monitoring', () => {
        it('should initialize monitoring service successfully', async () => {
            const status = await monitoringService.getMonitoringStatus();
            expect(status.isMonitoring).toBe(true);
            expect(status.monitoringFrequency).toBeGreaterThan(0);
        });

        it('should detect anomaly patterns', async () => {
            const testEvents = [
                { eventType: 'FAILED_LOGIN', severity: 'HIGH', timestamp: new Date().toISOString() },
                { eventType: 'FAILED_LOGIN', severity: 'HIGH', timestamp: new Date().toISOString() },
                { eventType: 'FAILED_LOGIN', severity: 'HIGH', timestamp: new Date().toISOString() }
            ];

            const score = await anomalyAnalyzer.analyzeEventPatterns(testEvents);
            expect(score).toBeGreaterThan(0);
        });

        it('should trigger automated response for critical threat', async () => {
            mockBruteForceProtection.blockIpAddress.mockResolvedValue(undefined);

            await automatedResponse.handleThreat({
                threatLevel: 'CRITICAL',
                anomalyScore: 0.95,
                attackAttempts: [{ type: 'BRUTE_FORCE', severity: 'CRITICAL' }],
                timestamp: new Date().toISOString()
            });

            expect(mockBruteForceProtection.blockIpAddress).toHaveBeenCalled();
            expect(mockAuditService.logSecurityEvent).toHaveBeenCalled();
        });

        it('should handle brute force attack', async () => {
            mockBruteForceProtection.blockIpAddress.mockResolvedValue(undefined);

            const threatData = {
                threatLevel: 'HIGH',
                ipAddress: '192.168.1.100',
                attackAttempts: [{ type: 'BRUTE_FORCE', count: 6 }]
            };

            await automatedResponse.handleThreat(threatData);

            expect(mockBruteForceProtection.blockIpAddress).toHaveBeenCalledWith(
                '192.168.1.100',
                expect.any(String),
                expect.any(Number)
            );
        });

        it('should analyze user behavior', async () => {
            const testEvents = [
                { eventType: 'USER_LOGIN', eventData: { success: false }, timestamp: new Date().toISOString() },
                { eventType: 'USER_LOGIN', eventData: { success: false }, timestamp: new Date().toISOString() },
                { eventType: 'USER_LOGIN', eventData: { success: false }, timestamp: new Date().toISOString() }
            ];

            const result = await anomalyAnalyzer.analyzeUserBehavior('test-user', testEvents);

            expect(result).toBeDefined();
            expect(result.userId).toBe('test-user');
            expect(result.anomalyScore).toBeGreaterThan(0);
        });

        it('should generate anomaly report', async () => {
            mockAuditService.queryAuditLogs.mockResolvedValue([]);

            const report = await anomalyAnalyzer.generateAnomalyReport(
                new Date(Date.now() - 86400000),
                new Date()
            );

            expect(report).toBeDefined();
            expect(report.totalEvents).toBe(0);
            expect(report.anomalyScore).toBe(0);
        });
    });

    describe('Performance Tests', () => {
        it('should process events quickly', async () => {
            const events = Array(100).fill({
                eventType: 'DATA_ACCESS',
                severity: 'LOW',
                timestamp: new Date().toISOString()
            });

            const startTime = Date.now();
            const score = await anomalyAnalyzer.analyzeEventPatterns(events);
            const endTime = Date.now();

            const processingTime = endTime - startTime;
            expect(processingTime).toBeLessThan(1000); // أقل من ثانية
            expect(score).toBeDefined();
        });
    });
});
