import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const envPath = path.join(__dirname, '../.env');

function generateSecureSecret(length = 64) {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = upper + lower + numbers + special;

    let secret = '';
    secret += upper[crypto.randomInt(0, upper.length)];
    secret += lower[crypto.randomInt(0, lower.length)];
    secret += numbers[crypto.randomInt(0, numbers.length)];
    secret += special[crypto.randomInt(0, special.length)];

    for (let i = 4; i < length; i++) {
        secret += all[crypto.randomInt(0, all.length)];
    }

    // Shuffle the secret
    return secret.split('').sort(() => 0.5 - Math.random()).join('');
}

function fixEnv() {
    console.log('🔧 Starting .env repair script...');

    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    } else {
        console.log('📝 .env file not found, creating new one.');
    }

    const lines = envContent.split('\n');
    const newLines: string[] = [];
    const handledKeys = new Set<string>();

    const updates: Record<string, string> = {
        'JWT_SECRET': generateSecureSecret(64),
        'ENCRYPTION_MASTER_KEY': generateSecureSecret(64),
        'PRODUCTION_API_KEY': 'apex_prod_key_2026_safe_access_v1',
        'MONITORING_SERVICE_URL': 'https://monitoring.apex-platform.com',
        'NODE_ENV': 'production'
    };

    for (const line of lines) {
        let replaced = false;
        for (const key in updates) {
            if (line.startsWith(`${key}=`)) {
                newLines.push(`${key}=${updates[key]}`);
                handledKeys.add(key);
                replaced = true;
                break;
            }
        }
        if (!replaced && line.trim() !== '') {
            newLines.push(line);
        }
    }

    for (const key in updates) {
        if (!handledKeys.has(key)) {
            newLines.push(`${key}=${updates[key]}`);
        }
    }

    fs.writeFileSync(envPath, newLines.join('\n') + '\n');
    console.log('✅ .env file successfully updated with secure keys and required variables.');
}

fixEnv();
