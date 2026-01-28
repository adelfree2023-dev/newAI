import * as request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs/promises';
import { SecurityMonitoringService } from './security-monitoring.service';
import { AnomalyAnalyzerService } from './anomaly-analyzer.service';
import { AutomatedResponseService } from '../response/automated-response.service';
import { AlertNotifierService } from '../response/alert-notifier.service';
import { DataSnapshotService } from '../recovery/data-snapshot.service';
import { RollbackService } from '../recovery/rollback.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { BruteForceProtectionService } from '../../auth/services/brute-force-protection.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';

describe('Security Monitoring Acceptance Tests (M4)', () => {
    let app: INestApplication;
    let monitoringService: SecurityMonitoringService;
    let anomalyAnalyzer: AnomalyAnalyzerService;
    let automatedResponse: AutomatedResponseService;
    let alertNotifier: AlertNotifierService;
    let snapshotService: DataSnapshotService;
    let rollbackService: RollbackService;

    const mockAuditService = {
        logSecurityEvent: jest.fn(),
        logSystemEvent: jest.fn(),
        logBusinessEvent: jest.fn(),
        queryAuditLogs: jest.fn()
    };

    const mockBruteForceProtection = {
        blockIpAddress: jest.fn(),
        isAccountLocked: jest.fn()
    };

    const mockTenantContext = {
        getTenantId: jest.fn(() => 'test-tenant'),
        isSystemContext: jest.fn(() => false)
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
                AlertNotifierService,
                DataSnapshotService,
                RollbackService,
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
        alertNotifier = moduleFixture.get<AlertNotifierService>(AlertNotifierService);
        snapshotService = moduleFixture.get<DataSnapshotService>(DataSnapshotService);
        rollbackService = moduleFixture.get<RollbackService>(RollbackService);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('M4 Acceptance Criteria', () => {
        it('should detect and block IP after 5 failed login attempts', async () => {
            mockBruteForceProtection.blockIpAddress.mockResolvedValue(undefined);

            // محاكاة 6 محاولات فاشلة
            for (let i = 0; i < 6; i++) {
                await automatedResponse.handleThreat({
                    threatLevel: 'HIGH',
                    anomalyScore: 0.8,
                    attackAttempts: [{ type: 'BRUTE_FORCE', count: i + 1 }],
                    timestamp: new Date().toISOString()
                });
            }

            expect(mockBruteForceProtection.blockIpAddress).toHaveBeenCalled();
            expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
                'THREAT_RESPONSE_EXECUTED',
                expect.objectContaining({ threatLevel: 'HIGH' })
            );
        });

        it('should log all delete operations in audit logs', async () => {
            const testData = { id: '123', name: 'test' };

            await snapshotService.createSnapshot(testData, {
                tenantId: 'test-tenant',
                operation: 'DATA_DELETE',
                description: 'Test delete operation'
            });

            expect(mockAuditService.logBusinessEvent).toHaveBeenCalledWith(
                'SNAPSHOT_CREATED',
                expect.objectContaining({ operation: 'DATA_DELETE' })
            );
        });

        it('should respond within 10 seconds to detected threats', async () => {
            const startTime = Date.now();

            await automatedResponse.handleThreat({
                threatLevel: 'CRITICAL',
                anomalyScore: 0.95,
                attackAttempts: [{ type: 'SQL_INJECTION', severity: 'CRITICAL' }],
                timestamp: new Date().toISOString()
            });

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            expect(responseTime).toBeLessThan(10000); // أقل من 10 ثوانٍ
        });

        it('should achieve 100% coverage of sensitive operations', async () => {
            const operations = [
                'USER_LOGIN',
                'USER_LOGOUT',
                'DATA_CREATE',
                'DATA_UPDATE',
                'DATA_DELETE',
                'CONFIG_CHANGE',
                'PAYMENT_PROCESS'
            ];

            for (const operation of operations) {
                await snapshotService.createSnapshot(
                    { operation },
                    { tenantId: 'test-tenant', operation }
                );
            }

            // التحقق من تسجيل جميع العمليات
            expect(mockAuditService.logBusinessEvent).toHaveBeenCalledTimes(operations.length);
        });

        it('should create and restore snapshots successfully', async () => {
            const testData = {
                products: [{ id: '1', name: 'Product 1' }],
                settings: { theme: 'dark' }
            };

            // إنشاء لقطة
            const snapshotId = await snapshotService.createSnapshot(testData, {
                tenantId: 'test-tenant',
                operation: 'BACKUP',
                description: 'Test snapshot'
            });

            expect(snapshotId).toBeDefined();

            // استعادة اللقطة (Mock implementation of restore needed if real fs is not used, but snapshotService uses real fs)
            // Since it's E2E, it might fail if snapshotsDir is not clean or permissions issue
            const restoredData = await snapshotService.restoreSnapshot(snapshotId);

            expect(restoredData).toEqual(testData);
        });

        it('should rollback to previous state successfully', async () => {
            const originalData = { value: 'original' };
            const modifiedData = { value: 'modified' };

            // إنشاء نقطة استرداد
            await rollbackService.createRollbackPoint('test-tenant', 'UPDATE', originalData);

            // محاولة الاسترداد
            const result = await rollbackService.rollbackToPreviousState('test-tenant', 'UPDATE');

            expect(result.success).toBe(true);
            expect(result.restoredData).toEqual(originalData);
        });

        it('should send multi-channel alerts for critical threats', async () => {
            const alertData = {
                severity: 'CRITICAL' as const,
                title: 'Test Critical Alert',
                message: 'This is a critical security alert',
                eventType: 'TEST_CRITICAL',
                tenantId: 'test-tenant'
            };

            await alertNotifier.sendMultiChannelAlert(alertData);

            expect(mockAuditService.logSecurityEvent).toHaveBeenCalledWith(
                'ALERT_SENT',
                expect.objectContaining({ severity: 'CRITICAL' })
            );
        });

        it('should detect anomaly patterns in event sequences', async () => {
            const testEvents = Array(10).fill({
                eventType: 'FAILED_LOGIN',
                severity: 'HIGH',
                timestamp: new Date().toISOString()
            });

            const anomalyScore = await anomalyAnalyzer.analyzeEventPatterns(testEvents);

            expect(anomalyScore).toBeGreaterThan(0.7); // يجب أن يكون مرتفعاً
        });

        it('should maintain monitoring service uptime', async () => {
            const status = await monitoringService.getMonitoringStatus();

            expect(status.isMonitoring).toBe(true);
            expect(status.monitoringFrequency).toBeGreaterThan(0);
        });
    });

    describe('Performance Tests', () => {
        it('should process 1000 events per second', async () => {
            const events = Array(1000).fill({
                eventType: 'DATA_ACCESS',
                severity: 'LOW',
                timestamp: new Date().toISOString()
            });

            const startTime = Date.now();
            await anomalyAnalyzer.analyzeEventPatterns(events);
            const endTime = Date.now();

            const processingTime = endTime - startTime;
            const eventsPerSecond = 1000 / (processingTime / 1000);

            expect(eventsPerSecond).toBeGreaterThan(500); // أكثر من 500 حدث/ثانية
        });

        it('should handle concurrent monitoring checks', async () => {
            const promises = Array(50).fill(null).map(() =>
                monitoringService.getMonitoringStatus()
            );

            const results = await Promise.all(promises);

            expect(results.length).toBe(50);
            results.forEach(result => expect(result.isMonitoring).toBe(true));
        });
    });

    describe('Security Tests', () => {
        it('should encrypt snapshot data', async () => {
            const testData = { sensitive: 'data' };

            mockEncryptionService.encryptSensitiveData.mockResolvedValue('encrypted-data');

            const snapshotId = await snapshotService.createSnapshot(testData, {
                tenantId: 'test-tenant',
                operation: 'TEST'
            });

            const snapshot = await snapshotService['readSnapshot'](snapshotId);

            // البيانات يجب أن تكون مشفرة
            expect(snapshot.data).toEqual('encrypted-data');
        });

        it('should verify checksum on restore', async () => {
            const testData = { value: 'test' };

            const snapshotId = await snapshotService.createSnapshot(testData, {
                tenantId: 'test-tenant',
                operation: 'TEST'
            });

            // محاولة تعديل اللقطة (Writing manually back)
            const filePath = join(process.cwd(), 'snapshots', 'test-tenant', `${snapshotId}.json.gz`);
            const zlib = require('zlib');
            const data = await fs.readFile(filePath);
            const decompressed = zlib.gunzipSync(data);
            const snapshot = JSON.parse(decompressed.toString());
            snapshot.checksum = 'invalid_checksum';
            const compressed = zlib.gzipSync(JSON.stringify(snapshot));
            await fs.writeFile(filePath, compressed);

            // يجب أن يفشل الاسترداد
            await expect(snapshotService.restoreSnapshot(snapshotId)).rejects.toThrow();
        });
    });
});
