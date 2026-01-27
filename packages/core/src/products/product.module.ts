import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { BusinessController } from './business.controller';
import { TenantModule } from '../tenants/tenant.module';

@Module({
    imports: [TenantModule],
    providers: [ProductService],
    controllers: [BusinessController],
    exports: [ProductService]
})
export class ProductModule { }
