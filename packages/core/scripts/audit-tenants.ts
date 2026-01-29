import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { TenantService } from '../src/tenants/tenant.service';
import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';

async function audit() {
    const logger = new Logger('TenantAudit');
    logger.log('🔍 Starting Multi-tenancy Audit...');

    const app = await NestFactory.createApplicationContext(AppModule);
    const tenantService = app.get(TenantService);
    const dataSource = app.get(DataSource);

    try {
        // 1. Get all registered tenants from DB
        const registeredTenants = await tenantService.getAllActiveTenants();
        const registeredIds = new Set(registeredTenants.map(t => t.id));
        const registeredSchemas = new Set(registeredTenants.map(t => `tenant_${t.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`));

        logger.log(`📋 Found ${registeredTenants.length} registered tenants in DB.`);

        // 2. Get all existing schemas in Postgres
        const schemas = await dataSource.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
    `);

        const existingSchemas = schemas.map(s => s.schema_name);
        logger.log(`💾 Found ${existingSchemas.length} physical schemas in database.`);

        // 3. Identify Orphans
        const orphans = existingSchemas.filter(s => !registeredSchemas.has(s));
        if (orphans.length > 0) {
            logger.warn(`⚠️ Found ${orphans.length} ORPHANED schemas (no matching record in tenants table):`);
            orphans.forEach(s => console.log(`   - ${s}`));
        } else {
            logger.log('✅ No orphaned schemas found.');
        }

        // 4. Identify Missing Schemas
        const missing = Array.from(registeredSchemas).filter(s => !existingSchemas.includes(s));
        if (missing.length > 0) {
            logger.error(`❌ Found ${missing.length} MISSING schemas (record exists but no physical schema):`);
            missing.forEach(s => console.log(`   - ${s}`));
        }

        // 5. User Registry Check
        logger.log('👥 Checking User Registry...');
        const users = await dataSource.query(`SELECT email, role, "tenantId", status FROM users ORDER BY role ASC`);
        logger.log(`📊 Total users in central registry: ${users.length}`);
        console.table(users);

        // 6. Tenant Registry Check
        logger.log('🏪 Checking Tenant Registry...');
        const tenants = await dataSource.query(`SELECT id, name, domain, status FROM tenants`);
        console.table(tenants);

        // 7. Schema List Check
        logger.log('📁 Physical Schemas List:');
        const schemaList = await dataSource.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'tenant_%'
      ORDER BY schema_name ASC
    `);
        console.table(schemaList);

        logger.log('✅ Audit Complete.');

    } catch (error) {
        logger.error(`Audit failed: ${error.message}`);
    } finally {
        await app.close();
    }
}

audit();
