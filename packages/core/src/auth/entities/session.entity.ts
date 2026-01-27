import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { v4 as uuidv4 } from 'uuid';

@Entity('sessions')
@Index(['userId'])
@Index(['token'])
@Index(['expiresAt'])
export class Session {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    token: string;

    @Column({ type: 'varchar', length: 255 })
    refreshToken: string;

    @Column({ type: 'varchar', length: 45 })
    ipAddress: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    userAgent: string | null;

    @Column({ type: 'varchar', length: 36 })
    userId: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    invalidatedAt: Date | null;

    @Column({ type: 'boolean', default: false })
    isInvalidated: boolean;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @Column({ type: 'varchar', length: 36, nullable: true })
    tenantId: string | null;

    constructor(partial: Partial<Session>) {
        Object.assign(this, partial);
        this.token = this.token || uuidv4();
        this.refreshToken = this.refreshToken || uuidv4();
        this.expiresAt = this.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 أيام
    }

    invalidate() {
        this.isInvalidated = true;
        this.invalidatedAt = new Date();
    }

    isActive(): boolean {
        return !this.isInvalidated && this.expiresAt > new Date();
    }

    renew(durationDays: number = 7) {
        this.expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
        this.invalidatedAt = null;
        this.isInvalidated = false;
    }
}
