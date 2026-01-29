import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/tenants/tenant.service';
import { UserService } from '../src/auth/services/user.service';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import { UserRole } from '../src/auth/entities/user.entity';

async function superSeed() {
    const logger = new Logger('SuperSeed');
    logger.log('🚀 Starting Full Database Reset & Seed...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const tenantService = app.get(TenantService);
    const userService = app.get(UserService);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
        // 1. CLEANUP: Drop all tenant schemas
        logger.log('🧹 Cleaning up old schemas...');
        const schemas = await queryRunner.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);

        for (const schema of schemas) {
            logger.log(`   - Dropping schema: ${schema.schema_name}`);
            await queryRunner.query(`DROP SCHEMA IF EXISTS "${schema.schema_name}" CASCADE`);
        }

        // 2. CLEANUP: Truncate main tables
        logger.log('🗑️ Truncating main tables...');
        await queryRunner.query('TRUNCATE TABLE "tenants" CASCADE');
        await queryRunner.query('TRUNCATE TABLE "users" CASCADE');
        await queryRunner.query('TRUNCATE TABLE "sessions" CASCADE');

        // 3. SEED: 2 Super Admins
        logger.log('👑 Creating 2 Super Admins...');
        for (let i = 1; i <= 2; i++) {
            await userService.create({
                email: `superadmin${i}@apex.com`,
                passwordHash: 'Apex@2026',
                firstName: 'Super',
                lastName: `Admin ${i}`,
                role: UserRole.SUPER_ADMIN,
                tenantId: null,
                emailVerified: true
            });
            logger.log(`   ✅ Created Super Admin: superadmin${i}@apex.com`);
        }

        // 4. SEED: 10 Tenants & Tenant Admins
        logger.log('🏪 Creating 10 Tenants with Admins...');
        for (let i = 1; i <= 10; i++) {
            const tenantId = `store-${i}`;
            const tenantName = `Apex Luxury Store ${i}`;

            // Create Tenant (this handles schema creation via TenantService)
            await tenantService.createTenant({
                id: tenantId,
                name: tenantName,
                domain: `store${i}.apex-platform.com`,
                businessType: 'RETAIL',
                contactEmail: `owner${i}@gmail.com`
            });

            // Create Tenant Admin in central users table
            await userService.create({
                email: `owner${i}@gmail.com`,
                passwordHash: 'Store@2026',
                firstName: 'Store',
                lastName: `Owner ${i}`,
                role: UserRole.TENANT_ADMIN,
                tenantId: tenantId,
                emailVerified: true
            });

            logger.log(`   ✅ Created ${tenantName} + Owner: owner${i}@gmail.com`);
        }

        logger.log('🎉 Super Seed completed successfully!');
        logger.log('--------------------------------------------------');
        logger.log('Admins: superadmin1@apex.com / Apex@2026');
        logger.log('Tenants: store-1 to store-10');
        logger.log('Tenant Passwords: Store@2026');

    } catch (error) {
        logger.error(`❌ Seed failed: ${error.message}`);
        console.error(error);
    } finally {
        await queryRunner.release();
        await app.close();
    }
}

superSeed();
