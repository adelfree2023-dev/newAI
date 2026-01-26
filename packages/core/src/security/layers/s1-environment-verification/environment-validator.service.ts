import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EnvironmentValidatorService implements OnModuleInit {
  private readonly logger = new Logger(EnvironmentValidatorService.name);

  constructor(private readonly configService?: ConfigService) { }

  async onModuleInit() {
    this.logger.log('🔐 [S1] بدء التحقق من البيئة والأمان...');
    this.validateCriticalVariables();
    this.validateSecretStrength();
    this.validateEnvironmentMode();
    this.logger.log('✅ [S1] اجتازت البيئة جميع اختبارات الأمان');
  }

  private validateCriticalVariables() {
    const criticalVars = [
      'ENCRYPTION_MASTER_KEY',
      'JWT_SECRET',
      'DATABASE_URL',
      'MASTER_ADMIN_EMAIL',
      'REDIS_URL',
      'ASMP_SECURITY_LEVEL'
    ];

    for (const varName of criticalVars) {
      const value = this.configService ? this.configService.get<string>(varName) : process.env[varName];
      if (!value || value.trim() === '') {
        const errorMessage = `❌ [S1] متغير بيئي حرج مفقود: ${varName}. النظام سيرفض التشغيل.`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }
  }

  private validateSecretStrength() {
    const masterKey = this.configService ? this.configService.get<string>('ENCRYPTION_MASTER_KEY') : process.env['ENCRYPTION_MASTER_KEY'];
    const jwtSecret = this.configService ? this.configService.get<string>('JWT_SECRET') : process.env['JWT_SECRET'];

    // التحقق من قوة المفاتيح
    const minKeyLength = 64;
    if ((masterKey?.length || 0) < minKeyLength || (jwtSecret?.length || 0) < minKeyLength) {
      const errorMessage = `❌ [S1] مفاتيح ضعيفة: يجب أن تكون المفاتيح 64 حرفاً على الأقل (الحالي مفقود أو قصير)`;
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // التحقق من تعقيد المفاتيح
    const hasUpperCase = /[A-Z]/.test(masterKey);
    const hasLowerCase = /[a-z]/.test(masterKey);
    const hasNumbers = /\d/.test(masterKey);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(masterKey);

    if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars)) {
      this.logger.warn('⚠️ [S1] المفتاح الرئيسي يحتاج لمزيد من التعقيد. يوصى بإضافة أحرف كبيرة وأرقام ورموز خاصة');
    }
  }

  private validateEnvironmentMode() {
    const nodeEnv = this.configService ? this.configService.get<string>('NODE_ENV', 'development') : (process.env['NODE_ENV'] || 'development');
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
      // في بيئة الإنتاج، التحقق من عدم وجود متغيرات التطوير
      const devVars = ['DEV_ONLY_FEATURES', 'DEBUG_MODE', 'TEST_DATABASE_URL'];
      for (const varName of devVars) {
        const val = this.configService ? this.configService.get(varName) : process.env[varName];
        if (val) {
          this.logger.warn(`⚠️ [S1] متغير تطوير موجود في بيئة الإنتاج: ${varName}`);
        }
      }

      // التحقق من ضرورة وجود متغيرات الإنتاج فقط
      const prodVars = ['PRODUCTION_API_KEY', 'MONITORING_SERVICE_URL'];
      for (const varName of prodVars) {
        if (this.configService ? !this.configService.get(varName) : !process.env[varName]) {
          this.logger.warn(`⚠️ [S1] متغير إنتاج مفقود في بيئة الإنتاج: ${varName}`);
        }
      }
    }
  }

  validateDynamicUpdate(key: string, newValue: string): boolean {
    this.logger.log(`🔄 [S1] محاولة تحديث متغير البيئة ديناميكياً: ${key}`);

    try {
      // منع تحديث المفاتيح الحساسة ديناميكياً دون إعادة تشغيل
      const sensitiveKeys = ['ENCRYPTION_MASTER_KEY', 'JWT_SECRET', 'DATABASE_URL'];
      if (sensitiveKeys.includes(key)) {
        this.logger.warn(`🔒 [S1] تحديث ديناميكي محظور للمفتاح الحساس: ${key}`);
        return false;
      }

      // التحقق من صحة القيمة الجديدة
      if (newValue.trim() === '') {
        this.logger.error(`❌ [S1] قيمة فارغة لـ ${key} - الرفض`);
        return false;
      }

      process.env[key] = newValue;
      this.logger.log(`✅ [S1] تم تحديث ${key} بنجاح`);
      return true;
    } catch (error) {
      this.logger.error(`❌ [S1] فشل تحديث ${key}: ${error.message}`);
      return false;
    }
  }
}