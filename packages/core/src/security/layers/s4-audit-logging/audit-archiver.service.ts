import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { join } from 'path';
import { createGzip } from 'zlib';
import { promisify } from 'util';
import { AuditService } from './audit.service';
import { pipeline } from 'stream';

const pipe = promisify(pipeline);

@Injectable()
export class AuditArchiverService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(AuditArchiverService.name);
    private archiveInterval: NodeJS.Timeout;
    private readonly auditDir: string;
    private readonly archiveDir: string;
    private readonly retentionDays: number;
    private readonly maxFileSizeMB: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly auditService: AuditService
    ) {
        this.auditDir = join(process.cwd(), 'logs', 'audit-logs');
        this.archiveDir = join(process.cwd(), 'logs', 'audit-archive');
        this.retentionDays = this.configService.get<number>('AUDIT_RETENTION_DAYS', 90);
        this.maxFileSizeMB = this.configService.get<number>('AUDIT_MAX_FILE_SIZE_MB', 100);
    }

    async onModuleInit() {
        this.logger.log('🗄️ [M4] بدء تهيئة خدمة أرشفة سجلات التدقيق...');

        // إنشاء مجلد الأرشفة
        try {
            await fs.mkdir(this.archiveDir, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }

        // بدء عملية الأرشفة التلقائية كل ساعة
        this.archiveInterval = setInterval(() => {
            this.performArchiving().catch(err =>
                this.logger.error(`[M4] ❌ فشل في عملية الأرشفة: ${err.message}`)
            );
        }, 60 * 60 * 1000); // كل ساعة

        // عملية أولية فورية بعد 5 دقائق (أو فوراً للاختبار إذا لزم الأمر)
        setTimeout(() => this.performArchiving(), 5 * 60 * 1000);

        this.logger.log('✅ [M4] تم تهيئة خدمة أرشفة سجلات التدقيق');
    }

    private async performArchiving() {
        this.logger.debug('[M4] 🔄 بدء عملية الأرشفة التلقائية...');

        try {
            // 1. أرشفة الملفات القديمة (> 7 أيام)
            await this.archiveOldLogs();

            // 2. تقسيم الملفات الكبيرة (> 100MB)
            await this.splitLargeFiles();

            // 3. حذف السجلات المنتهية الصلاحية (> 90 يوم)
            await this.purgeExpiredLogs();

            this.logger.log('[M4] ✅ اكتملت عملية الأرشفة بنجاح');
        } catch (error) {
            this.logger.error(`[M4] ❌ فشل عملية الأرشفة: ${error.message}`);
            await this.auditService.logSecurityEvent('ARCHIVING_FAILURE', {
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    private async archiveOldLogs() {
        const files = await fs.readdir(this.auditDir);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        for (const file of files) {
            if (!file.endsWith('.log')) continue;

            const filePath = join(this.auditDir, file);
            const stats = await fs.stat(filePath);

            if (stats.mtime < sevenDaysAgo) {
                // ضغط الملف ونقله للأرشفة
                const gzipPath = join(this.archiveDir, `${file}.gz`);

                const gzipStream = createGzip();
                const reader = createReadStream(filePath);
                const writer = createWriteStream(gzipPath);

                await pipe(reader, gzipStream, writer);

                // حذف الملف الأصلي بعد النجاح
                await fs.unlink(filePath);

                this.logger.debug(`[M4] ✅ تم أرشفة الملف: ${file}`);

                await this.auditService.logSystemEvent('AUDIT_LOG_ARCHIVED', {
                    originalFile: file,
                    archivedFile: `${file}.gz`,
                    sizeBytes: stats.size,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    private async splitLargeFiles() {
        const maxBytes = this.maxFileSizeMB * 1024 * 1024;
        const files = await fs.readdir(this.auditDir);

        for (const file of files) {
            if (!file.endsWith('.log')) continue;

            const filePath = join(this.auditDir, file);
            const stats = await fs.stat(filePath);

            if (stats.size > maxBytes) {
                this.logger.warn(`[M4] ⚠️ ملف سجلات كبير يحتاج تقسيم: ${file} (${Math.round(stats.size / 1024 / 1024)}MB)`);

                // تقسيم الملف إلى أجزاء أصغر
                const content = await fs.readFile(filePath, 'utf-8');
                const lines = content.split('\n');
                const chunks = Math.ceil(lines.length / 10000); // 10000 سطر لكل جزء

                for (let i = 0; i < chunks; i++) {
                    const chunkLines = lines.slice(i * 10000, (i + 1) * 10000);
                    const chunkContent = chunkLines.join('\n');
                    const chunkFile = file.replace('.log', `.${i + 1}.log`);
                    const chunkPath = join(this.auditDir, chunkFile);

                    await fs.writeFile(chunkPath, chunkContent);
                }

                // أرشفة الملف الأصلي بعد التقسيم
                await fs.unlink(filePath);

                await this.auditService.logSystemEvent('AUDIT_LOG_SPLIT', {
                    originalFile: file,
                    chunks: chunks,
                    originalSize: stats.size,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    private async purgeExpiredLogs() {
        const files = await fs.readdir(this.archiveDir);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - this.retentionDays);

        for (const file of files) {
            if (!file.endsWith('.gz')) continue;

            const filePath = join(this.archiveDir, file);
            const stats = await fs.stat(filePath);

            if (stats.mtime < expiryDate) {
                await fs.unlink(filePath);

                this.logger.debug(`[M4] 🗑️ تم حذف سجلات منتهية الصلاحية: ${file}`);

                await this.auditService.logSystemEvent('AUDIT_LOG_PURGED', {
                    file: file,
                    ageDays: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
                    timestamp: new Date().toISOString()
                });
            }
        }
    }

    async getArchiveStats() {
        try {
            const [auditFiles, archiveFiles] = await Promise.all([
                fs.readdir(this.auditDir),
                fs.readdir(this.archiveDir)
            ]);

            const activeLogsSize = (await Promise.all(
                auditFiles.filter(f => f.endsWith('.log')).map(async f =>
                    (await fs.stat(join(this.auditDir, f))).size
                )
            )).reduce((sum, size) => sum + size, 0);

            const archiveSize = (await Promise.all(
                archiveFiles.filter(f => f.endsWith('.gz')).map(async f =>
                    (await fs.stat(join(this.archiveDir, f))).size
                )
            )).reduce((sum, size) => sum + size, 0);

            return {
                activeLogs: {
                    count: auditFiles.filter(f => f.endsWith('.log')).length,
                    sizeMB: Math.round(activeLogsSize / 1024 / 1024),
                    oldestFile: auditFiles.length > 0 ? auditFiles[0] : null
                },
                archivedLogs: {
                    count: archiveFiles.filter(f => f.endsWith('.gz')).length,
                    sizeMB: Math.round(archiveSize / 1024 / 1024),
                    oldestFile: archiveFiles.length > 0 ? archiveFiles[0] : null
                },
                retentionDays: this.retentionDays,
                lastArchived: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error(`[M4] ❌ فشل الحصول على إحصائيات الأرشفة: ${error.message}`);
            return null;
        }
    }

    onModuleDestroy() {
        if (this.archiveInterval) {
            clearInterval(this.archiveInterval);
        }
    }
}
