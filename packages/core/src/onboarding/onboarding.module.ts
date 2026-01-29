import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { TenantModule } from '../tenants/tenant.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TenantModule,
        AuthModule,
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule { }
