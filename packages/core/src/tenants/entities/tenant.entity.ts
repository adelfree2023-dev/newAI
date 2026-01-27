import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    id: string; // This is the tenantId/slug (e.g., 'acme-corp')

    @Column({ type: 'varchar', length: 150 })
    name: string;

    @Column({ type: 'varchar', length: 100, unique: true })
    domain: string;

    @Column({ type: 'varchar', length: 50 })
    businessType: string;

    @Column({ type: 'varchar', length: 255 })
    contactEmail: string;

    @Column({ type: 'varchar', length: 20, default: 'ACTIVE' })
    status: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    schemaName: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;
}
