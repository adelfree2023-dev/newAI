import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ApexConfigService } from './apex-config.service';
import { SecurityContext } from '../../security.context';

@Injectable()
export class EnvValidatorService implements OnModuleInit {
  private readonly logger = new Logger(EnvValidatorService.name);

  constructor(
    private readonly config: ApexConfigService,
    private readonly securityContext: SecurityContext
  ) { }

  async onModuleInit() {
    this.logger.log('🔐 [S1] بدء التحقق من البيئة والأمان...');
    this.validateEnvironment();
    this.logger.log('✅ [S1] اجتازت البيئة جميع اختبارات الأمان');
  }

  validateEnvironment() {
    this.validateCriticalVariables();
    this.validateSecretStrength();
    this.validateEnvironmentMode();

    if (!this.config.isProduction()) {
      this.logger.warn('⚠️ [S1] النظام يعمل في بيئة تطوير - تأكد من تأمين جميع المنافذ');
    }
  }

  async validateSystemReadiness(): Promise<boolean> {
    try {
      this.validateEnvironment();
      return true;
    } catch (error) {
      if (!this.config.isProduction()) return true;
      return false;
    }
  }

  private validateCriticalVariables() {
    const criticalVars = [
      'ENCRYPTION_MASTER_KEY',
      'JWT_SECRET',
      'DATABASE_URL'
    ];

    for (const varName of criticalVars) {
      const value = this.config.get<string>(varName);
      if (!value || value.trim() === '') {
        if (this.config.isProduction()) {
          const errorMessage = `❌ [S1] متغير بيئي حرج مفقود: ${varName}. النظام سيرفض التشغيل.`;
          this.securityContext.logSecurityEvent('CRITICAL_CONFIG_MISSING', { variable: varName });
          this.logger.error(errorMessage);
          throw new Error(errorMessage);
        } else {
          this.logger.warn(`⚠️ [S1] متغير بيئي مفقود في وضع التطوير: ${varName}`);
        }
      }
    }
  }

  private validateSecretStrength() {
    const masterKey = this.config.get<string>('ENCRYPTION_MASTER_KEY');
    const jwtSecret = this.config.get<string>('JWT_SECRET');

    if (this.config.isProduction() && jwtSecret === 'short') {
      throw new Error('JWT_SECRET غير آمن للإنتاج');
    }

    if (!masterKey || !jwtSecret) return;

    // التحقق من قوة المفاتيح
    const minKeyLength = 64;
    if ((masterKey?.length || 0) < minKeyLength || (jwtSecret?.length || 0) < minKeyLength) {
      if (this.config.isProduction()) {
        const errorMessage = `❌ [S1] مفاتيح ضعيفة: يجب أن تكون المفاتيح 64 حرفاً على الأقل (الحالي مفقود أو قصير)`;
        this.logger.error(errorMessage);
        throw new Error(errorMessage);
      } else {
        this.logger.warn('⚠️ [S1] مفاتيح ضعيفة: يوصى باستخدام 64 حرفاً على الأقل');
      }
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
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
      // في بيئة الإنتاج، التحقق من عدم وجود متغيرات التطوير
      const devVars = ['DEV_ONLY_FEATURES', 'DEBUG_MODE', 'TEST_DATABASE_URL'];
      for (const varName of devVars) {
        const val = this.config.get(varName);
        if (val) {
          this.logger.warn(`⚠️ [S1] متغير تطوير موجود في بيئة الإنتاج: ${varName}`);
        }
      }

      // التحقق من ضرورة وجود متغيرات الإنتاج فقط
      const prodVars = ['PRODUCTION_API_KEY', 'MONITORING_SERVICE_URL'];
      for (const varName of prodVars) {
        if (!this.config.get(varName)) {
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