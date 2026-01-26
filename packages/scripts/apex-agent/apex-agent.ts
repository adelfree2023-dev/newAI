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
        projectRoot: join(__dirname, '../../..'), // root of repo
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
            await this.initializeLogFile();

            const envCheck = await this.diagnoseEnvironment();
            if (!envCheck.valid) {
                criticalIssues++;
                errors.push(...envCheck.errors);
                recommendations.push(...envCheck.recommendations);
            }

            const fileCheck = await this.checkFileIntegrity();
            if (!fileCheck.valid) {
                criticalIssues++;
                errors.push(...fileCheck.errors);
                recommendations.push(...fileCheck.recommendations);
            }

            const protocolCheck = await this.scanForProtocolViolations();
            if (!protocolCheck.valid) {
                criticalIssues++;
                errors.push(...protocolCheck.errors);
                recommendations.push(...protocolCheck.recommendations);
            }

            const endTime = Date.now();
            const duration = (endTime - startTime) / 1000;

            const report = {
                timestamp: new Date().toISOString(),
                duration: `${duration.toFixed(2)}s`,
                securityProtocol: this.config.securityProtocol,
                criticalIssues,
                errors,
                recommendations
            };

            await this.logFinalReport(report);
            logger.log(`✅ [APEX_AGENT] اكتمل الفحص في ${duration.toFixed(2)} ثانية`);

            return {
                success: criticalIssues === 0,
                reportPath: this.config.logFile,
                criticalIssues,
                errors,
                recommendations
            };
        } catch (error: any) {
            logger.error('❌ [APEX_AGENT] فشل تنشيط العميل', error.stack);
            return { success: false, errors: [error.message] };
        }
    },

    async initializeLogFile() {
        const logDir = join(this.config.projectRoot, 'logs');
        await fs.mkdir(logDir, { recursive: true });
        await fs.writeFile(this.config.logFile, `AGENT REPORT\n`);
        await fs.writeFile(this.config.errorLogFile, `AGENT ERRORS\n`);
    },

    async diagnoseEnvironment() {
        const errors: string[] = [];
        const recommendations: string[] = [];
        const criticalVars = ['ENCRYPTION_MASTER_KEY', 'JWT_SECRET', 'DATABASE_URL'];

        for (const varName of criticalVars) {
            if (!process.env[varName]) {
                errors.push(`مفقود: ${varName}`);
                recommendations.push(`قم بتعيين ${varName}`);
            }
        }
        return { valid: errors.length === 0, errors, recommendations };
    },

    async checkFileIntegrity() {
        const errors: string[] = [];
        for (const file of this.config.criticalFiles) {
            try {
                await fs.access(join(this.config.projectRoot, file));
            } catch {
                errors.push(`ملف مفقود: ${file}`);
            }
        }
        return { valid: errors.length === 0, errors, recommendations: [] };
    },

    async scanForProtocolViolations() {
        const errors: string[] = [];
        try {
            const mainTs = await fs.readFile(join(this.config.projectRoot, 'packages/core/src/main.ts'), 'utf-8');
            if (!mainTs.includes('helmet')) errors.push('S8: Helmet missing');
        } catch {
            errors.push('Cannot read main.ts');
        }
        return { valid: errors.length === 0, errors, recommendations: [] };
    },

    async logFinalReport(report: any) {
        await fs.appendFile(this.config.logFile, JSON.stringify(report, null, 2));
    },

    async logErrorDetails(error: any) {
        await fs.appendFile(this.config.errorLogFile, error.stack);
    }
};
