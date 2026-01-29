import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';
import { promisify } from 'util';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { v4 as uuidv4 } from 'uuid';

const gzip = promisify(createGzip);

@Injectable()
export class DataSnapshotService {
    private readonly logger = new Logger(DataSnapshotService.name);
    private readonly snapshotsDir: string;
    private readonly retentionDays: number;
    private readonly maxSnapshotsPerTenant: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService,
        private readonly encryptionService: EncryptionService
    ) {
        this.snapshotsDir = join(process.cwd(), 'snapshots');
        this.retentionDays = this.configService.get<number>('SNAPSHOT_RETENTION_DAYS', 30);
        this.maxSnapshotsPerTenant = this.configService.get<number>('MAX_SNAPSHOTS_PER_TENANT', 10);
    }

    /**
     * إنشاء لقطة بيانات جديدة
     */
    async createSnapshot(data: any, context: {
        tenantId: string;
        operation: string;
        userId?: string;
        description?: string;
    }): Promise<string> {
        try {
            const snapshotId = uuidv4();
            const timestamp = new Date().toISOString();
            const tenantId = context.tenantId;

            this.logger.log(`[M4] 📸 إنشاء لقطة بيانات: ${snapshotId} للمستأجر ${tenantId}`);

            // إنشاء هيكل البيانات
            const snapshotData = {
                id: snapshotId,
                timestamp,
                tenantId,
                operation: context.operation,
                userId: context.userId,
                description: context.description,
                data: await this.encryptData(data),
                checksum: this.calculateChecksum(data)
            };

            // حفظ اللقطة
            await this.saveSnapshot(snapshotData, tenantId);

            // تسجيل الحدث
            await this.auditService.logBusinessEvent('SNAPSHOT_CREATED', {
                snapshotId,
                tenantId,
                operation: context.operation,
                timestamp,
                size: JSON.stringify(snapshotData).length
            });

            // تنظيف اللقطات القديمة
            await this.cleanupOldSnapshots(tenantId);

            this.logger.log(`[M4] ✅ تم إنشاء اللقطة: ${snapshotId}`);

            return snapshotId;

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إنشاء لقطة البيانات: ${error.message}`);

            await this.auditService.logSecurityEvent('SNAPSHOT_CREATION_FAILURE', {
                tenantId: context.tenantId,
                operation: context.operation,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * استعادة لقطة بيانات
     */
    async restoreSnapshot(snapshotId: string): Promise<any> {
        try {
            this.logger.warn(`[M4] 🔄 استعادة لقطة البيانات: ${snapshotId}`);

            // قراءة اللقطة
            const snapshot = await this.readSnapshot(snapshotId);

            if (!snapshot) {
                throw new Error(`Snapshot not found: ${snapshotId}`);
            }

            // فك تشفير البيانات
            const decryptedData = await this.decryptData(snapshot.data);

            // التحقق من سلامة البيانات
            const isValid = this.verifyChecksum(decryptedData, snapshot.checksum);

            if (!isValid) {
                throw new Error('Snapshot checksum verification failed');
            }

            // تسجيل الحدث
            await this.auditService.logBusinessEvent('SNAPSHOT_RESTORED', {
                snapshotId,
                tenantId: snapshot.tenantId,
                operation: snapshot.operation,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`[M4] ✅ تم استعادة اللقطة: ${snapshotId}`);

            return decryptedData;

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل استعادة لقطة البيانات: ${error.message}`);

            await this.auditService.logSecurityEvent('SNAPSHOT_RESTORE_FAILURE', {
                snapshotId,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });

            throw error;
        }
    }

    /**
     * الحصول على جميع اللقطات لمستأجر معين
     */
    async getSnapshotsForTenant(tenantId: string): Promise<any[]> {
        try {
            const snapshotsPath = join(this.snapshotsDir, tenantId);

            try {
                await fs.access(snapshotsPath);
            } catch {
                return []; // لا توجد لقطات
            }

            const files = await fs.readdir(snapshotsPath);
            const snapshots = [];

            for (const file of files) {
                if (file.endsWith('.json.gz')) {
                    try {
                        const snapshot = await this.readSnapshotFile(join(snapshotsPath, file));
                        snapshots.push(snapshot);
                    } catch (error) {
                        this.logger.warn(`[M4] ⚠️ فشل قراءة ملف اللقطة: ${file}`);
                    }
                }
            }

            // الفرز حسب الطابع الزمني (الأحدث أولاً)
            return snapshots.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل الحصول على اللقطات: ${error.message}`);
            throw error;
        }
    }

    /**
     * حذف لقطة بيانات
     */
    async deleteSnapshot(snapshotId: string): Promise<void> {
        try {
            this.logger.warn(`[M4] 🗑️ حذف لقطة البيانات: ${snapshotId}`);

            const snapshot = await this.readSnapshot(snapshotId);

            if (!snapshot) {
                throw new Error(`Snapshot not found: ${snapshotId}`);
            }

            const filePath = join(this.snapshotsDir, snapshot.tenantId, `${snapshotId}.json.gz`);
            await fs.unlink(filePath);

            await this.auditService.logBusinessEvent('SNAPSHOT_DELETED', {
                snapshotId,
                tenantId: snapshot.tenantId,
                timestamp: new Date().toISOString()
            });

            this.logger.log(`[M4] ✅ تم حذف اللقطة: ${snapshotId}`);

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل حذف لقطة البيانات: ${error.message}`);
            throw error;
        }
    }

    /**
     * حفظ اللقطة في الملف
     */
    private async saveSnapshot(snapshot: any, tenantId: string): Promise<void> {
        const tenantDir = join(this.snapshotsDir, tenantId);

        // إنشاء مجلد المستأجر إذا لم يكن موجوداً
        await fs.mkdir(tenantDir, { recursive: true });

        const filePath = join(tenantDir, `${snapshot.id}.json.gz`);

        // ضغط وحفظ البيانات
        const dataString = JSON.stringify(snapshot);
        // Note: createGzip and writeStream usage in the provided snippet was slightly malformed for await
        const compressed = await this.gzipBuffer(Buffer.from(dataString));
        await fs.writeFile(filePath, compressed);
    }

    private async gzipBuffer(buffer: Buffer): Promise<Buffer> {
        const zlib = require('zlib');
        return new Promise((resolve, reject) => {
            zlib.gzip(buffer, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
    }

    /**
     * قراءة اللقطة من الملف
     */
    private async readSnapshot(snapshotId: string): Promise<any | null> {
        try {
            const tenants = await fs.readdir(this.snapshotsDir);

            for (const tenantId of tenants) {
                const tenantDir = join(this.snapshotsDir, tenantId);
                const filePath = join(tenantDir, `${snapshotId}.json.gz`);

                try {
                    await fs.access(filePath);
                    return await this.readSnapshotFile(filePath);
                } catch {
                    // الملف غير موجود في هذا المجلد، نجرب المستأجر التالي
                }
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    /**
     * قراءة ملف اللقطة
     */
    private async readSnapshotFile(filePath: string): Promise<any> {
        const compressedData = await fs.readFile(filePath);
        const zlib = require('zlib');
        const decompressed = await new Promise<Buffer>((resolve, reject) => {
            zlib.gunzip(compressedData, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });

        const dataString = decompressed.toString('utf-8');
        return JSON.parse(dataString);
    }

    /**
     * تشفير البيانات
     */
    private async encryptData(data: any): Promise<string> {
        const dataString = JSON.stringify(data);
        return await this.encryptionService.encryptSensitiveData(dataString, 'snapshot');
    }

    /**
     * فك تشفير البيانات
     */
    private async decryptData(encryptedData: string): Promise<any> {
        const decryptedString = await this.encryptionService.decryptSensitiveData(encryptedData, 'snapshot');
        return JSON.parse(decryptedString);
    }

    /**
     * حساب checksum للبيانات
     */
    private calculateChecksum(data: any): string {
        const crypto = require('crypto');
        const dataString = JSON.stringify(data);
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * التحقق من checksum
     */
    private verifyChecksum(data: any, expectedChecksum: string): boolean {
        const actualChecksum = this.calculateChecksum(data);
        return actualChecksum === expectedChecksum;
    }

    /**
     * تنظيف اللقطات القديمة
     */
    private async cleanupOldSnapshots(tenantId: string): Promise<void> {
        const snapshots = await this.getSnapshotsForTenant(tenantId);

        // حذف اللقطات القديمة أكثر من 30 يوم
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - this.retentionDays);

        const oldSnapshots = snapshots.filter(s =>
            new Date(s.timestamp) < thirtyDaysAgo
        );

        for (const snapshot of oldSnapshots) {
            await this.deleteSnapshot(snapshot.id);
        }

        // إذا تجاوز عدد اللقطات الحد الأقصى، احذف الأقدم
        if (snapshots.length > this.maxSnapshotsPerTenant) {
            const snapshotsToDelete = snapshots.slice(this.maxSnapshotsPerTenant);

            for (const snapshot of snapshotsToDelete) {
                await this.deleteSnapshot(snapshot.id);
            }
        }
    }

    /**
     * الحصول على إحصائيات اللقطات
     */
    async getSnapshotStats(): Promise<any> {
        try {
            const tenants = await fs.readdir(this.snapshotsDir);
            const stats = {
                totalSnapshots: 0,
                totalSize: 0,
                tenants: {} as any,
                oldestSnapshot: null,
                newestSnapshot: null
            };

            for (const tenantId of tenants) {
                const snapshots = await this.getSnapshotsForTenant(tenantId);

                stats.tenants[tenantId] = {
                    count: snapshots.length,
                    snapshots: snapshots.map(s => ({
                        id: s.id,
                        timestamp: s.timestamp,
                        operation: s.operation,
                        size: s.data.length
                    }))
                };

                stats.totalSnapshots += snapshots.length;
            }

            return stats;

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل الحصول على إحصائيات اللقطات: ${error.message}`);
            throw error;
        }
    }
}
