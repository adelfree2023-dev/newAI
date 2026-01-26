import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EnvironmentValidatorService } from './environment-validator.service';

@Module({
  imports: [ConfigModule],
  providers: [EnvironmentValidatorService, ConfigService],
  exports: [EnvironmentValidatorService],
})
export class EnvironmentVerificationModule implements OnModuleInit {
  constructor(private readonly envValidator: EnvironmentValidatorService) {}

  async onModuleInit() {
    await this.envValidator.onModuleInit();
  }
}