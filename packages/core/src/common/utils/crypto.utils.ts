import * as crypto from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(crypto.scrypt);

export async function generateSecureHash(password: string, salt?: string): Promise<string> {
    const currentSalt = salt || crypto.randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, currentSalt, 64)) as Buffer;
    return `${currentSalt}:${derivedKey.toString('hex')}`;
}

export async function verifySecureHash(password: string, hash: string): Promise<boolean> {
    if (!hash || !hash.includes(':')) {
        return false;
    }

    try {
        const [salt, storedHash] = hash.split(':');
        const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
        return derivedKey.toString('hex') === storedHash;
    } catch (error) {
        return false;
    }
}
