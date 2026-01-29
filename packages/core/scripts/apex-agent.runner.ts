import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvValidatorService } from '../src/security/layers/s1-environment-verification/env-validator.service';
import { ApexConfigService } from '../src/security/layers/s1-environment-verification/apex-config.service';
import { SecurityContext } from '../src/security/security.context';
import { AuditService } from '../src/security/layers/s4-audit-logging/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.production', '.env'],
        }),
    ],
    providers: [
        EnvValidatorService,
        ApexConfigService,
        SecurityContext,
        {
            provide: AuditService,
            useValue: { logSecurityEvent: () => { }, logSystemEvent: () => { } },
        },
        {
            provide: PrismaService,
            useValue: {},
        },
    ],
})
class AgentRunnerModule { }

async function bootstrap() {
    try {
        const app = await NestFactory.createApplicationContext(AgentRunnerModule, { logger: false });
        const validator = app.get(EnvValidatorService);

        await validator.onModuleInit();
        console.log('✅ [S1] اجتازت البيئة جميع اختبارات الأمان');

        await app.close();
        process.exit(0);
    } catch (error) {
        console.error(`❌ [S1] فشل التحقق من البيئة: ${error.message}`);
        process.exit(1);
    }
}

bootstrap();
