import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const envPath = path.join(__dirname, '../.env');

function generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
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
