import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { BusinessController } from './business.controller';
import { TenantModule } from '../tenants/tenant.module';

@Module({
    imports: [TenantModule],
    providers: [ProductService],
    controllers: [ProductController, BusinessController],
    exports: [ProductService]
})
export class ProductModule { }
