import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
    private cache = new Map<string, any>();

    async get(key: string): Promise<any> {
        return this.cache.get(key) || null;
    }

    async set(key: string, value: any, ttl?: number): Promise<void> {
        this.cache.set(key, value);
        if (ttl) {
            setTimeout(() => this.cache.delete(key), ttl * 1000);
        }
    }

    async del(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async clear(): Promise<void> {
        this.cache.clear();
    }
}
