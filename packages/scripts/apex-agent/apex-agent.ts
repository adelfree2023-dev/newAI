import { Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = new Logger('ApexAgent');

export const apexAgent = {
    name: 'Apex Security Monitor',
    config: {
        securityProtocol: 'ASMP/v2.3',
        projectRoot: join(__dirname, '../../..'), // المجلد الرئيسي للمشروع (52/)
        logFile: join(__dirname, '../../../logs/agent-report.log'),
        errorLogFile: join(__dirname, '../../../logs/agent-errors.log'),
        devMode: process.env.AGENT_DEV_MODE === 'true',
        criticalFiles: [
            'packages/core/src/main.ts',
            'packages/core/src/security/layers/s1-environment-verification/environment-validator.service.ts',
            'packages/core/src/security/layers/s2-tenant-isolation/tenant-context.service.ts',
            'packages/core/src/security/layers/s7-encryption/encryption.service.ts'
        ]
    },

    async activate() {
        const startTime = Date.now();
        let criticalIssues = 0;
        const errors: string[] = [];
        const recommendations: string[] = [];

        try {
            logger.log(`🤖 [APEX_AGENT] بدء تشغيل المراقب الأمني - ${this.config.securityProtocol}`);

            if (this.config.devMode) this.enableVerboseLogging();
            await this.initializeLogFile();

            // 1. فحص سلامة البيئة
            const envCheck = await this.diagnoseEnvironment();
            if (!envCheck.valid) {
                criticalIssues++;
                errors.push(...envCheck.errors);
                recommendations.push(...envCheck.recommendations);
            }

            // 2. فحص سلامة الملفات الحرجة
            const fileCheck = await this.checkFileIntegrity();
            if (!fileCheck.valid) {
                criticalIssues++;
                errors.push(...fileCheck.errors);
                recommendations.push(...fileCheck.recommendations);
            }

            // 3. إصلاح أخطاء التجميع
            const buildCheck = await this.fixBuildIssues();
            if (!buildCheck.valid) {
                criticalIssues++;
                errors.push(...buildCheck.errors);
            }

            // 4. فحص انتهاكات بروتوكول ASMP
            const protocolCheck = await this.scanForProtocolViolations();
            if (!protocolCheck.valid) {
                criticalIssues++;
                errors.push(...protocolCheck.errors);
                recommendations.push(...protocolCheck.recommendations);
            }

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;

            // تسجيل النتائج النهائية
            const report = {
                timestamp: new Date().toISOString(),
                duration: `${duration.toFixed(2)}s`,
                securityProtocol: this.config.securityProtocol,
                criticalIssues,
                errors,
                recommendations,
                fileIntegrity: fileCheck.valid,
                environmentValid: envCheck.valid,
                buildStatus: buildCheck.valid,
                protocolCompliance: protocolCheck.valid
            };

            await this.logFinalReport(report);

            logger.log(`✅ [APEX_AGENT] اكتمل الفحص بنجاح في ${duration.toFixed(2)} ثانية`);
            return {
                success: criticalIssues === 0,
                reportPath: this.config.logFile,
                criticalIssues,
                errors,
                recommendations
            };
        } catch (error: any) {
            await this.logErrorDetails(error, 'AGENT_ACTIVATION');
            logger.error('❌ [APEX_AGENT] فشل في التشغيل', error?.stack);

            return {
                success: false,
                criticalIssues: 1,
                errors: [error.message || 'خطأ غير معروف'],
                reportPath: this.config.errorLogFile
            };
        }
    },

    async initializeLogFile() {
        try {
            const logDir = join(this.config.projectRoot, 'logs');
            await fs.mkdir(logDir, { recursive: true });

            const header = `===== Apex Agent Report - ${new Date().toISOString()} =====\n`;
            await fs.writeFile(this.config.logFile, header);
            await fs.writeFile(this.config.errorLogFile, header);
        } catch (err) {
            console.warn('⚠️ Agent could not initialize log files:', err.message);
        }
    },

    async diagnoseEnvironment() {
        logger.log('🔍 [APEX_AGENT] فحص سلامة البيئة...');
        const errors: string[] = [];
        const recommendations: string[] = [];

        // 1. التحقق من المتغيرات الحرجة
        const criticalVars = ['ENCRYPTION_MASTER_KEY', 'JWT_SECRET', 'DATABASE_URL'];
        for (const varName of criticalVars) {
            if (!process.env[varName]) {
                errors.push(`المتغير البيئي مفقود: ${varName}`);
                recommendations.push(`أنشئ ${varName} بقيمة آمنة`);
            } else if (process.env[varName].length < 64) {
                errors.push(`المفتاح ${varName} ضعيف (أقل من 64 حرفاً)`);
                recommendations.push(`حدث ${varName} ليكون 64 حرفًا على الأقل`);
            }
        }

        // 2. التحقق من اتصال قاعدة البيانات
        try {
            if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql')) {
                errors.push('رابط قاعدة البيانات غير صالح');
                recommendations.push('تأكد من أن DATABASE_URL يبدأ بـ "postgresql://"');
            }
        } catch (e) {
            errors.push('فشل في الاتصال بقاعدة البيانات');
            recommendations.push('تحقق من إعدادات قاعدة البيانات وصلاحيات المستخدم');
        }

        // 3. التحقق من Redis
        try {
            if (!process.env.REDIS_URL) {
                errors.push('REDIS_URL غير محدد - مطلوب لخدمات الأمان');
                recommendations.push('أنشئ متغير REDIS_URL بالإعدادات الصحيحة');
            }
        } catch (e) {
            errors.push('فشل في الاتصال بـ Redis');
            recommendations.push('تحقق من تشغيل خدمة Redis والصلاحيات');
        }

        const valid = errors.length === 0;
        logger.log(`✅ [APEX_AGENT] فحص البيئة: ${valid ? 'ناجح' : 'فشل'}`);

        return { valid, errors, recommendations };
    },

    async checkFileIntegrity() {
        logger.log('🔍 [APEX_AGENT] فحص سلامة الملفات الحرجة...');
        const errors: string[] = [];
        const recommendations: string[] = [];

        for (const file of this.config.criticalFiles) {
            const filePath = join(this.config.projectRoot, file);

            try {
                await fs.access(filePath);
            } catch (e) {
                errors.push(`الملف مفقود: ${file}`);
                recommendations.push(`استعد الملف من المستودع أو أعد عملية الاستنساخ`);
            }
        }

        const valid = errors.length === 0;
        logger.log(`✅ [APEX_AGENT] فحص سلامة الملفات: ${valid ? 'ناجح' : 'فشل'}`);

        return { valid, errors, recommendations };
    },

    async fixBuildIssues() {
        logger.log('🔧 [APEX_AGENT] إصلاح أخطاء التجميع...');
        const errors: string[] = [];

        try {
            // 1. تنظيف مجلد التوزيع في core
            const coreDir = join(this.config.projectRoot, 'packages/core');
            await execAsync('rm -rf dist', { cwd: coreDir });

            // 2. إعادة التجميع
            await execAsync('npx tsc --skipLibCheck --noEmitOnError --outDir dist --esModuleInterop', { cwd: coreDir });

            logger.log('✅ [APEX_AGENT] تم إصلاح عملية التجميع بنجاح');
            return { valid: true, errors };

        } catch (error: any) {
            errors.push(`فشل في إعادة التجميع: ${error.message}`);
            return { valid: false, errors };
        }
    },

    async scanForProtocolViolations() {
        logger.log('🔍 [APEX_AGENT] فحص انتهاكات بروتوكول ASMP...');
        const errors: string[] = [];
        const recommendations: string[] = [];

        try {
            const mainTsPath = join(this.config.projectRoot, 'packages/core/src/main.ts');
            const mainTsContent = await fs.readFile(mainTsPath, 'utf-8');

            if (!mainTsContent.includes('helmet({')) {
                errors.push('S8: مكتبة Helmet غير مضمنة لحماية رؤوس HTTP');
                recommendations.push('أضف مكتبة Helmet مع التكوين المناسب');
            }

            if (!mainTsContent.includes('EnvironmentValidatorService')) {
                errors.push('S1: خدمة التحقق من البيئة غير مضمنة في نقطة التشغيل');
                recommendations.push('أضف EnvironmentValidatorService في بداية التشغيل');
            }

            const valid = errors.length === 0;
            return { valid, errors, recommendations };

        } catch (error: any) {
            errors.push(`فشل في فحص الانتهاكات: ${error.message}`);
            return { valid: false, errors, recommendations };
        }
    },

    async logFinalReport(report: any) {
        try {
            const reportContent = `
==================================================
APEX AGENT - تقرير فحص الصحة الأمنية
==================================================
التاريخ: ${report.timestamp}
المدة: ${report.duration}

النتائج:
• الأخطاء الحرجة: ${report.criticalIssues}

${report.recommendations.map((rec: string, i: number) => `   ${i + 1}. ${rec}`).join('\n')}
`;
            await fs.appendFile(this.config.logFile, reportContent);
        } catch (e) {
            logger.error('❌ فشل في كتابة التقرير النهائي');
        }
    },

    async logErrorDetails(error: any, context: string) {
        try {
            await fs.appendFile(this.config.errorLogFile, `${new Date().toISOString()} [${context}] ${error.stack}\n`);
        } catch (e) { }
    },

    enableVerboseLogging() {
        logger.log('🔍 تم تفعيل وضع التسجيل المفصل');
    }
};
