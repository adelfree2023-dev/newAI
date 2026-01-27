import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    TENANT_ADMIN = 'TENANT_ADMIN',
    STORE_MANAGER = 'STORE_MANAGER',
    CUSTOMER = 'CUSTOMER'
}

export enum UserStatus {
    ACTIVE = 'ACTIVE',
    LOCKED = 'LOCKED',
    SUSPENDED = 'SUSPENDED',
    INACTIVE = 'INACTIVE'
}

@Entity('users')
@Index(['email', 'tenantId'], { unique: true })
@Index(['tenantId', 'role'])
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    email: string;

    @Column({ type: 'varchar', length: 100 })
    firstName: string;

    @Column({ type: 'varchar', length: 100 })
    lastName: string;

    @Column({ type: 'varchar', length: 255 })
    @Exclude()
    passwordHash: string;

    @Column({ type: 'enum', enum: UserRole, default: UserRole.CUSTOMER })
    role: UserRole;

    @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
    status: UserStatus;

    @Column({ type: 'varchar', length: 36, nullable: true })
    tenantId: string | null;

    @Column({ type: 'boolean', default: false })
    isTwoFactorEnabled: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @Exclude()
    twoFactorSecret: string | null;

    @Column({ type: 'int', default: 0 })
    failedLoginAttempts: number;

    @Column({ type: 'timestamp', nullable: true })
    lockedUntil: Date | null;

    @Column({ type: 'varchar', length: 45, nullable: true })
    lastLoginIp: string | null;

    @Column({ type: 'timestamp', nullable: true })
    lastLoginAt: Date | null;

    @Column({ type: 'boolean', default: false })
    emailVerified: boolean;

    @Column({ type: 'varchar', length: 255, nullable: true })
    @Exclude()
    resetPasswordToken: string | null;

    @Column({ type: 'timestamp', nullable: true })
    resetPasswordExpires: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt: Date;

    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.passwordHash && !this.passwordHash.startsWith('$2b$')) {
            this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
        }
    }

    async validatePassword(password: string): Promise<boolean> {
        return bcrypt.compare(password, this.passwordHash);
    }

    generateVerificationToken(): string {
        return uuidv4();
    }

    lockAccount(durationMinutes: number = 15) {
        this.status = UserStatus.LOCKED;
        this.lockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
        this.failedLoginAttempts = 0;
    }

    unlockAccount() {
        if (this.lockedUntil && this.lockedUntil < new Date()) {
            this.status = UserStatus.ACTIVE;
            this.lockedUntil = null;
        }
    }

    incrementFailedLogin() {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= 5) {
            this.lockAccount(15);
        }
    }

    resetFailedLoginAttempts() {
        this.failedLoginAttempts = 0;
    }

    get fullName(): string {
        return `${this.firstName} ${this.lastName}`.trim();
    }

    isSuperAdmin(): boolean {
        return this.role === UserRole.SUPER_ADMIN;
    }

    canAccessTenant(tenantId: string): boolean {
        if (this.isSuperAdmin()) return true;
        if (this.role === UserRole.TENANT_ADMIN && this.tenantId === tenantId) return true;
        if (this.role === UserRole.STORE_MANAGER && this.tenantId === tenantId) return true;
        return false;
    }
}
