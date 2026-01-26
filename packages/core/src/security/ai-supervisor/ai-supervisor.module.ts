import { Module, Global } from '@nestjs/common';
import { AISecuritySupervisorService } from './ai-security-supervisor.service';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import { ConfigModule } from '@nestjs/config';
import { VercelAgentFactory } from './vercel-integration/vercel-agent-factory';
import { VercelSkillMapper } from './vercel-integration/vercel-skill-mapper';
import { TestGenerationSkill } from './skills/test-generation-skill';
import { TestController } from './test/test.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [TestController],
  providers: [
    AISecuritySupervisorService,
    AuditService,
    TenantContextService,
    EncryptionService,
    VercelAgentFactory,
    TestGenerationSkill,
    {
      provide: VercelSkillMapper,
      useClass: VercelSkillMapper
    }
  ],
  exports: [
    AISecuritySupervisorService,
    VercelAgentFactory,
    VercelSkillMapper,
    TestGenerationSkill,
    AuditService,
    TenantContextService,
    EncryptionService
  ]
})
export class AISupervisorModule { }
