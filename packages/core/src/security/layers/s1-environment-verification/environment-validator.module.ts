import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EnvValidatorService } from './env-validator.service';
import { ApexConfigService } from './apex-config.service';

@Module({
  imports: [ConfigModule],
  providers: [EnvValidatorService, ApexConfigService],
  exports: [EnvValidatorService, ApexConfigService],
})
export class EnvironmentVerificationModule implements OnModuleInit {
  constructor(private readonly envValidator: EnvValidatorService) { }

  async onModuleInit() {
    await this.envValidator.onModuleInit();
  }
}