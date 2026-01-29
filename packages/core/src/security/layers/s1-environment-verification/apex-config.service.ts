import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApexConfigService {
    private readonly logger = new Logger(ApexConfigService.name);

    constructor(@Optional() private readonly configService?: ConfigService) {
        if (this.isProduction()) {
            this.validateCriticalVars();
        }
    }

    private validateCriticalVars() {
        const criticalVars = ['DATABASE_URL', 'JWT_SECRET'];
        for (const key of criticalVars) {
            if (!this.get(key)) {
                throw new Error(`Critical environment variable ${key} is missing in production!`);
            }
        }
    }

    get<T = any>(key: string, defaultValue?: T): T {
        if (this.configService) {
            return this.configService.get<T>(key, defaultValue);
        }
        return (process.env[key] as any) ?? defaultValue;
    }

    getOrThrow<T = any>(key: string): T {
        const value = this.get<T>(key);
        if (value === undefined || value === null) {
            throw new Error(`Configuration key "${key}" is missing`);
        }
        return value;
    }

    getNumber(key: string, defaultValue?: number): number {
        const val = this.get(key);
        return val !== undefined ? parseInt(String(val), 10) : defaultValue;
    }

    getBoolean(key: string, defaultValue?: boolean): boolean {
        const val = this.get(key);
        if (val === undefined || val === null) return defaultValue;
        return String(val) === 'true';
    }

    isProduction(): boolean {
        return this.get('NODE_ENV') === 'production';
    }

    isDevelopment(): boolean {
        const env = this.get('NODE_ENV');
        return env === 'development' || !env;
    }
}
