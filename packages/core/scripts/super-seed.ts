import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

async function superSeed() {
    const logger = new Logger('SuperSeed');
    logger.log('🚀 Starting Robust Raw SQL Seed...');

    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
    const dataSource = app.get(DataSource);
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

        const passwordHash = await bcrypt.hash('Apex@2026', 12);
        const storePasswordHash = await bcrypt.hash('Store@2026', 12);

        // 3. SEED: 2 Super Admins
        logger.log('👑 Creating 2 Super Admins...');
        for (let i = 1; i <= 2; i++) {
            const id = uuidv4();
            await queryRunner.query(`
            INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, status, "emailVerified")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [id, `superadmin${i}@apex.com`, passwordHash, 'Super', `Admin ${i}`, 'SUPER_ADMIN', 'ACTIVE', true]);
            logger.log(`   ✅ Created Super Admin: superadmin${i}@apex.com`);
        }

        // 4. SEED: 10 Tenants & Tenant Admins
        logger.log('🏪 Creating 10 Tenants with Schemas and Admins...');
        for (let i = 1; i <= 10; i++) {
            const tenantId = `store-${i}`;
            const schemaName = `tenant_store_${i}`;
            const tenantName = `Apex Luxury Store ${i}`;
            const email = `owner${i}@gmail.com`;

            // Create Physical Schema
            await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

            // Create Tenant Record
            await queryRunner.query(`
            INSERT INTO tenants (id, name, domain, "businessType", "contactEmail", status, "schemaName")
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [tenantId, tenantName, `store${i}.apex-platform.com`, 'RETAIL', email, 'ACTIVE', schemaName]);

            // Create Tenant Admin in central users table
            const userId = uuidv4();
            await queryRunner.query(`
            INSERT INTO users (id, email, "passwordHash", "firstName", "lastName", role, status, "tenantId", "emailVerified")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [userId, email, storePasswordHash, 'Store', `Owner ${i}`, 'TENANT_ADMIN', 'ACTIVE', tenantId, true]);

            logger.log(`   ✅ Created ${tenantName} (Schema: ${schemaName}) + Owner: ${email}`);
        }

        logger.log('🎉 Super Seed completed successfully with RAW SQL!');

    } catch (error) {
        logger.error(`❌ Seed failed: ${error.message}`);
        console.error(error);
    } finally {
        await queryRunner.release();
        await app.close();
    }
}

superSeed();
