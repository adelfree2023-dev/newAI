import { Controller, Post, Body, Get, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { QuickStartDto } from './dtos/quick-start.dto';

@ApiTags('Onboarding')
@Controller('onboarding')
export class OnboardingController {
    private readonly logger = new Logger(OnboardingController.name);

    constructor(private readonly onboardingService: OnboardingService) { }

    @Post('quick-start')
    @ApiOperation({ summary: 'إنشاء متجر في 60 ثانية' })
    @ApiResponse({ status: 201, description: 'تم إنشاء المتجر بنجاح' })
    @ApiResponse({ status: 409, description: 'النطاق محجوز بالفعل' })
    async quickStart(@Body() dto: QuickStartDto) {
        this.logger.log(`📥 طلب إنشاء سريع لمتجر: ${dto.storeName} (${dto.domain})`);

        const store = await this.onboardingService.createStoreWithTemplate(dto);

        return {
            success: true,
            storeId: store.id,
            storeUrl: `https://${store.domain}`,
            adminUrl: `https://admin.${store.domain}`,
            setupTime: '~50 seconds',
            message: '🎉 تم تجهيز متجرك ومخطط البيانات الخاص بك بنجاح!'
        };
    }

    @Get('check-domain/:domain')
    @ApiOperation({ summary: 'للتحقق من توفر النطاق' })
    async checkDomain(@Param('domain') domain: string) {
        const isAvailable = await this.onboardingService.checkDomainAvailability(domain);
        return {
            domain,
            isAvailable,
            suggestion: isAvailable ? null : `${domain}-${new Date().getFullYear()}`
        };
    }
}
