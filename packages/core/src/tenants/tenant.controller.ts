import { Controller, Get, Post, Body, Headers, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { TenantService } from './tenant.service';

@Controller('api/tenants')
export class TenantController {
    constructor(private readonly tenantService: TenantService) { }

    @Post()
    async createTenant(@Body() tenantData: any) {
        // محاكاة تعيين ID إذا لم يتم توفيره
        if (!tenantData.id) {
            tenantData.id = tenantData.domain || `tenant-${Date.now()}`;
        }
        return this.tenantService.createTenant(tenantData);
    }

    @Get()
    async getAllTenants() {
        return this.tenantService.getAllActiveTenants();
    }

    @Get('health')
    async getHealth(@Headers('X-Tenant-ID') tenantId: string) {
        if (!tenantId) {
            throw new HttpException('Tenant ID required', HttpStatus.BAD_REQUEST);
        }
        return {
            status: 'UP',
            tenantId,
            timestamp: new Date().toISOString()
        };
    }
}
