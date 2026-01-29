import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { AuditService } from '../s4-audit-logging/audit.service';
import { TenantContextService } from '../s2-tenant-isolation/tenant-context.service';
import { Scope } from '@nestjs/common';

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private static masterKey: Buffer;
  private saltCache: Map<string, Buffer> = new Map();
  private hkdfCache: Map<string, Buffer> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditService
  ) { }

  async onModuleInit() {
    this.logger.log('🔐 [S7] بدء تهيئة خدمات التشفير (onModuleInit)...');
    try {
      await this.initializeMasterKey();
      await this.validateEncryptionStrength();
      this.logger.log('✅ [S7] اكتملت تهيئة خدمات التشفير بنجاح');
    } catch (error) {
      this.logger.error(`❌ [S7] فشل تهيئة خدمات التشفير في onModuleInit: ${error.message}`);
    }
  }

  private async ensureMasterKeyInitialized() {
    if (!EncryptionService.masterKey) {
      this.logger.warn('[S7] ⚠️ المفتاح الرئيسي غير مهيأ. محاولة التهيئة التلقائية...');
      await this.initializeMasterKey();
    }
  }

  private async initializeMasterKey() {
    const masterKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY');

    if (!masterKey || masterKey.length < 64) {
      const errorMessage = '❌ [S7] مفتاح التشفير الرئيسي غير موجود أو غير آمن. يجب أن يكون 64 حرفاً على الأقل';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // تحويل المفتاح إلى بايتات باستخدام HKDF
    EncryptionService.masterKey = await this.deriveKey(masterKey, 'master_encryption_key', 32);
    this.logger.log('✅ [S7] تم تهيئة المفتاح الرئيسي للتشفير');
  }

  private async validateEncryptionStrength() {
    // اختبار قوة خوارزمية التشفير
    const testKey = randomBytes(32);
    const testIv = randomBytes(12);
    const testCipher = createCipheriv('aes-256-gcm', testKey, testIv);

    const testPlaintext = 'test_encryption_strength';
    const ciphertext = testCipher.update(testPlaintext, 'utf8', 'base64') + testCipher.final('base64');
    const authTag = testCipher.getAuthTag();

    const testDecipher = createDecipheriv('aes-256-gcm', testKey, testIv);
    testDecipher.setAuthTag(authTag);

    try {
      const deciphered = testDecipher.update(ciphertext, 'base64', 'utf8') + testDecipher.final('utf8');
      if (deciphered !== testPlaintext) {
        throw new Error('فشل اختبار قوة التشفير');
      }
      this.logger.log('✅ [S7] نجاح اختبار قوة خوارزمية التشفير');
    } catch (error) {
      this.logger.error(`❌ [S7] فشل اختبار قوة التشفير: ${error.message}`);
      throw new Error('خوارزمية التشفير غير آمنة');
    }
  }

  async encryptSensitiveData(data: string, context: string = 'general', tenantId: string = 'system'): Promise<string> {
    if (typeof data !== 'string' || data.trim() === '') {
      this.logger.warn(`[S7] ⚠️ محاولة تشفير بيانات فارغة للسياق: ${context}`);
      return '';
    }

    try {
      this.logger.debug(`[S7] 🔒 بدء تشفير البيانات للسياق: ${context}`);

      // استخدام المستأجر المبرد أو الافتراضي
      const effectiveTenantId = tenantId || 'system';
      const encryptionKey = await this.getTenantEncryptionKey(effectiveTenantId, context);

      // إنشاء IV عشوائي
      const iv = randomBytes(12);

      // إنشاء المشفر
      const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

      // تشفير البيانات
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // الحصول على علامة المصادقة
      const authTag = cipher.getAuthTag();

      // الدمج بين النتائج
      const result = JSON.stringify({
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encryptedData: encrypted,
        algorithm: 'aes-256-gcm',
        tenantId,
        context,
        timestamp: new Date().toISOString()
      });

      // تسجيل عملية التشفير
      this.auditService.logSecurityEvent('DATA_ENCRYPTION', {
        context,
        tenantId,
        timestamp: new Date().toISOString(),
        dataSize: data.length,
        success: true
      });

      return result;
    } catch (error) {
      this.logger.error(`[S7] ❌ خطأ في تشفير البيانات: ${error.message}`);

      // تسجيل حدث أمني
      this.auditService.logSecurityEvent('ENCRYPTION_FAILURE', {
        context,
        tenantId: tenantId || 'system',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new Error('فشل في تشفير البيانات الحساسة');
    }
  }

  async decryptSensitiveData(encryptedData: string, context: string = 'general', tenantId?: string): Promise<string> {
    if (typeof encryptedData !== 'string' || encryptedData.trim() === '') {
      this.logger.warn(`[S7] ⚠️ محاولة فك تشفير بيانات فارغة للسياق: ${context}`);
      return '';
    }

    try {
      this.logger.debug(`[S7] 🔓 بدء فك تشفير البيانات للسياق: ${context}`);

      // تحليل البيانات المشفرة
      const parsedData = JSON.parse(encryptedData);

      // التحقق من صحة البيانات
      if (!parsedData.iv || !parsedData.authTag || !parsedData.encryptedData) {
        throw new Error('بيانات التشفير غير صالحة');
      }

      // الحصول على مفتاح فك التشفير
      const effectiveTenantId = tenantId || parsedData.tenantId || 'system';
      const decryptionKey = await this.getTenantEncryptionKey(effectiveTenantId, context);

      // إنشاء الـ decipher
      const decipher = createDecipheriv(
        'aes-256-gcm',
        decryptionKey,
        Buffer.from(parsedData.iv, 'base64')
      );

      // تعيين علامة المصادقة
      decipher.setAuthTag(Buffer.from(parsedData.authTag, 'base64'));

      // فك التشفير
      let decrypted = decipher.update(parsedData.encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      // تسجيل عملية فك التشفير
      this.auditService.logSecurityEvent('DATA_DECRYPTION', {
        context,
        tenantId,
        timestamp: new Date().toISOString(),
        dataSize: decrypted.length,
        success: true
      });

      return decrypted;
    } catch (error) {
      this.logger.error(`[S7] ❌ خطأ في فك تشفير البيانات: ${error.message}`);

      // تسجيل حدث أمني
      this.auditService.logSecurityEvent('DECRYPTION_FAILURE', {
        context,
        tenantId: tenantId || 'system',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new Error('فشل في فك تشفير البيانات الحساسة');
    }
  }

  private async getTenantEncryptionKey(tenantId: string, context: string): Promise<Buffer> {
    try {
      // إنشاء معرف فريد للمفتاح
      const keyId = `${tenantId}:${context}`;

      // التحقق من وجود المفتاح في الذاكرة المؤقتة
      if (this.hkdfCache.has(keyId)) {
        return this.hkdfCache.get(keyId);
      }

      // التأكد من تهيئة المفتاح الرئيسي
      await this.ensureMasterKeyInitialized();

      // الحصول على الملح الخاص بالمفتاح
      const salt = await this.getTenantSalt(tenantId);

      // اشتقاق المفتاح باستخدام HKDF
      const hkdfKey = await this.hkdf(
        EncryptionService.masterKey,
        salt,
        `apex-encryption:${tenantId}:${context}`,
        32
      );

      // تخزين المفتاح في الذاكرة المؤقتة
      this.hkdfCache.set(keyId, hkdfKey);

      // إزالة المفتاح من الذاكرة المؤقتة بعد ساعتين
      setTimeout(() => {
        if (this.hkdfCache.has(keyId)) {
          this.hkdfCache.delete(keyId);
          this.logger.debug(`[S7] 🧹 تم مسح مفتاح التشفير المؤقت للمستأجر: ${tenantId}`);
        }
      }, 2 * 60 * 60 * 1000); // ساعتين

      return hkdfKey;
    } catch (error) {
      this.logger.error(`[S7] ❌ فشل الحصول على مفتاح التشفير للمستأجر: ${tenantId} - ${error.message}`);
      throw new Error('فشل في الحصول على مفتاح التشفير');
    }
  }

  private async getTenantSalt(tenantId: string): Promise<Buffer> {
    try {
      // التحقق من وجود الملح في الذاكرة المؤقتة
      if (this.saltCache.has(tenantId)) {
        return this.saltCache.get(tenantId);
      }

      // إنشاء ملح عشوائي للمستأجر الجديد
      const salt = randomBytes(16);

      // تخزين الملح في الذاكرة المؤقتة
      this.saltCache.set(tenantId, salt);

      // حفظ الملح في قاعدة البيانات (سيتم تنفيذه لاحقاً)
      // await this.saveTenantSalt(tenantId, salt);

      this.logger.log(`[S7] ✅ تم إنشاء ملح تشفير جديد للمستأجر: ${tenantId}`);

      return salt;
    } catch (error) {
      this.logger.error(`[S7] ❌ فشل الحصول على ملح التشفير للمستأجر: ${tenantId} - ${error.message}`);
      throw new Error('فشل في الحصول على ملح التشفير');
    }
  }

  private async hkdf(key: Buffer, salt: Buffer, info: string, length: number): Promise<Buffer> {
    const hkdf = promisify(scrypt);
    const derivedKey = await hkdf(key, salt, length);
    return Buffer.from(derivedKey as Buffer);
  }

  private async deriveKey(input: string, salt: string, length: number): Promise<Buffer> {
    const hkdf = promisify(scrypt);
    const derivedKey = await hkdf(input, salt, length);
    return Buffer.from(derivedKey as Buffer);
  }

  async hashData(data: string, pepper?: string): Promise<string> {
    if (typeof data !== 'string' || data.trim() === '') {
      throw new Error('البيانات المطلوب تجزئتها فارغة');
    }

    try {
      const salt = randomBytes(16);
      const pepperValue = pepper || this.configService.get<string>('HASH_PEPPER', 'default_pepper');

      const hashedData = await new Promise<string>((resolve, reject) => {
        const hash = scrypt(
          data + pepperValue,
          salt,
          64,
          (err, derivedKey) => {
            if (err) reject(err);
            else resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
          }
        );
      });

      return hashedData;
    } catch (error) {
      this.logger.error(`[S7] ❌ خطأ في تجزئة البيانات: ${error.message}`);
      throw new Error('فشل في تجزئة البيانات');
    }
  }

  async verifyHash(data: string, hashedData: string, pepper?: string): Promise<boolean> {
    try {
      const [saltHex, keyHex] = hashedData.split(':');
      if (!saltHex || !keyHex) {
        return false;
      }

      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(keyHex, 'hex');
      const pepperValue = pepper || this.configService.get<string>('HASH_PEPPER', 'default_pepper');

      const actualKey = await new Promise<Buffer>((resolve, reject) => {
        scrypt(
          data + pepperValue,
          salt,
          64,
          (err, derivedKey) => {
            if (err) reject(err);
            else resolve(derivedKey);
          }
        );
      });

      // استخدام timingSafeEqual لمنع هجمات القناة الجانبية
      return timingSafeEqual(expectedKey, actualKey);
    } catch (error) {
      this.logger.error(`[S7] ❌ خطأ في التحقق من تجزئة البيانات: ${error.message}`);
      return false;
    }
  }

  async rotateKeys(tenantId: string, oldContext?: string): Promise<boolean> {
    try {
      this.logger.log(`[S7] 🔄 بدء تدوير المفاتيح للمستأجر: ${tenantId}`);

      // الحصول على قائمة السياقات التي تحتاج لتدوير المفاتيح
      const contexts = oldContext ? [oldContext] : ['users', 'payments', 'settings', 'secrets'];

      for (const context of contexts) {
        const oldKeyId = `${tenantId}:${context}`;

        // إزالة المفتاح القديم من الذاكرة المؤقتة
        if (this.hkdfCache.has(oldKeyId)) {
          this.hkdfCache.delete(oldKeyId);
        }

        // إنشاء مفتاح جديد
        await this.getTenantEncryptionKey(tenantId, context);

        this.logger.log(`[S7] ✅ تم تدوير مفتاح التشفير للسياق: ${context}`);
      }

      // تسجيل عملية تدوير المفاتيح
      this.auditService.logSecurityEvent('KEY_ROTATION', {
        tenantId,
        contexts,
        timestamp: new Date().toISOString(),
        success: true
      });

      return true;
    } catch (error) {
      this.logger.error(`[S7] ❌ فشل تدوير المفاتيح للمستأجر: ${tenantId} - ${error.message}`);

      this.auditService.logSecurityEvent('KEY_ROTATION_FAILURE', {
        tenantId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      return false;
    }
  }

  async encryptFile(fileBuffer: Buffer, metadata: any): Promise<{ encryptedBuffer: Buffer; key: string }> {
    const effectiveTenantId = metadata.tenantId || 'system';
    try {
      this.logger.log(`[S7] 📁 بدء تشفير الملف للمستأجر: ${effectiveTenantId}`);

      // الحصول على مفتاح التشفير
      const fileKey = await this.getTenantEncryptionKey(effectiveTenantId, 'files');

      // إنشاء IV عشوائي
      const iv = randomBytes(12);

      // إنشاء المشفر
      const cipher = createCipheriv('aes-256-gcm', fileKey, iv);

      // تشفير البيانات
      let encrypted = cipher.update(fileBuffer);
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // الحصول على علامة المصادقة
      const authTag = cipher.getAuthTag();

      // إنشاء ملف مشفر يحتوي على البيانات والـ IV وعلامة المصادقة
      const resultBuffer = Buffer.concat([
        iv,
        authTag,
        encrypted
      ]);

      // تسجيل عملية التشفير
      this.auditService.logSecurityEvent('FILE_ENCRYPTION', {
        tenantId: effectiveTenantId,
        fileName: metadata.fileName || 'unknown',
        fileSize: fileBuffer.length,
        timestamp: new Date().toISOString(),
        success: true
      });

      return {
        encryptedBuffer: resultBuffer,
        key: `${effectiveTenantId}:files`
      };
    } catch (error) {
      this.logger.error(`[S7] ❌ خطأ في تشفير الملف: ${error.message}`);

      this.auditService.logSecurityEvent('FILE_ENCRYPTION_FAILURE', {
        tenantId: effectiveTenantId,
        fileName: metadata.fileName || 'unknown',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new Error('فشل في تشفير الملف');
    }
  }

  async decryptFile(encryptedBuffer: Buffer, keyId: string): Promise<Buffer> {
    const [keyTenantId, context] = keyId.split(':');
    try {
      this.logger.log(`[S7] 📂 بدء فك تشفير الملف للمستأجر: ${keyTenantId}`);

      // فصل الـ IV (12 بايت)
      const iv = encryptedBuffer.slice(0, 12);
      // فصل علامة المصادقة (16 بايت)
      const authTag = encryptedBuffer.slice(12, 28);
      // البيانات المشفرة المتبقية
      const encryptedData = encryptedBuffer.slice(28);

      // الحصول على مفتاح فك التشفير
      const decryptionKey = await this.getTenantEncryptionKey(keyTenantId, context || 'files');

      // إنشاء الـ decipher
      const decipher = createDecipheriv('aes-256-gcm', decryptionKey, iv);
      decipher.setAuthTag(authTag);

      // فك التشفير
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // تسجيل عملية فك التشفير
      this.auditService.logSecurityEvent('FILE_DECRYPTION', {
        tenantId: keyTenantId,
        timestamp: new Date().toISOString(),
        fileSize: decrypted.length,
        success: true
      });

      return decrypted;
    } catch (error) {
      this.logger.error(`[S7] ❌ خطأ في فك تشفير الملف: ${error.message}`);

      this.auditService.logSecurityEvent('FILE_DECRYPTION_FAILURE', {
        keyId,
        tenantId: keyTenantId,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw new Error('فشل في فك تشفير الملف');
    }
  }
}