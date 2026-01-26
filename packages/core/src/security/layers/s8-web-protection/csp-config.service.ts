import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CSPConfigService {
  private readonly logger = new Logger(CSPConfigService.name);
  private static defaultDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'"],
    connectSrc: ["'self'"],
    frameSrc: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: []
  };

  constructor(private readonly configService: ConfigService) { }

  generateCSPHeader(tenantId: string, hostname: string): string {
    try {
      // الحصول على تكوين CSP بناءً على بيئة التشغيل
      const cspConfig = this.getCSPConfig(tenantId, hostname);

      // بناء سلسلة التوجيهات
      const directives = [];

      for (const [directive, sources] of Object.entries(cspConfig)) {
        if (Array.isArray(sources) && sources.length > 0) {
          directives.push(`${directive} ${sources.join(' ')}`);
        } else if (directive === 'upgradeInsecureRequests' && (sources as any).length === 0) {
          directives.push(directive);
        }
      }

      const cspHeader = directives.join('; ');
      this.logger.debug(`[S8] CSP Header generated for tenant ${tenantId}: ${cspHeader.substring(0, 100)}...`);

      return cspHeader;
    } catch (error) {
      this.logger.error(`[S8] ❌ خطأ في توليد رأس CSP: ${error.message}`);

      // العودة إلى تكوين آمن افتراضي
      const fallbackDirectives = [];
      for (const [directive, sources] of Object.entries(CSPConfigService.defaultDirectives)) {
        if (Array.isArray(sources) && sources.length > 0) {
          fallbackDirectives.push(`${directive} ${sources.join(' ')}`);
        }
      }

      return fallbackDirectives.join('; ');
    }
  }

  private getCSPConfig(tenantId: string, hostname: string): any {
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // التكوين الأساسي
    const baseConfig = {
      ...CSPConfigService.defaultDirectives,
      scriptSrc: ["'self'", "'unsafe-inline'"], // إزالة 'unsafe-eval' للإنتاج
      frameSrc: ["'self'"],
      connectSrc: ["'self'"]
    };

    // إضافة مصادر آمنة للمستأجر
    const tenantDomains = this.getTenantDomains(tenantId, hostname);
    for (const directive of ['scriptSrc', 'styleSrc', 'imgSrc', 'fontSrc', 'connectSrc']) {
      if (baseConfig[directive]) {
        baseConfig[directive].push(...tenantDomains);
      }
    }

    // إضافات للتطوير
    if (isDevelopment) {
      baseConfig.scriptSrc.push('webpack://*');
      baseConfig.connectSrc.push('ws://*', 'wss://*');
      baseConfig.imgSrc.push('blob:');
    }

    // إضافات للإنتاج
    if (isProduction) {
      // إزالة 'unsafe-eval' في بيئة الإنتاج
      baseConfig.scriptSrc = baseConfig.scriptSrc.filter(src => src !== "'unsafe-eval'");

      // إضافة Google analytics و Firebase إذا مطلوب
      const enableAnalytics = this.configService.get<boolean>('ENABLE_ANALYTICS', false);
      if (enableAnalytics) {
        baseConfig.scriptSrc.push('https://www.google-analytics.com', 'https://www.googletagmanager.com');
        baseConfig.imgSrc.push('https://www.google-analytics.com');
        baseConfig.connectSrc.push('https://www.google-analytics.com');
      }

      // إضافة خدمات الدفع الآمنة
      baseConfig.frameSrc.push('https://*.stripe.com', 'https://checkout.paypal.com');
      baseConfig.connectSrc.push('https://api.stripe.com');
      baseConfig.imgSrc.push('https://*.stripe.com', 'https://*.paypal.com');

      // تفعيل ترقية الطلبات غير الآمنة
      baseConfig.upgradeInsecureRequests = [];
    }

    // تكوين خاص للمستأجرين
    if (tenantId !== 'system') {
      const tenantConfig = this.getTenantCSPConfig(tenantId);
      if (tenantConfig) {
        // دمج التكوين الخاص بالمستأجر مع التكوين الأساسي
        for (const directive of Object.keys(tenantConfig)) {
          if (baseConfig[directive] && Array.isArray(tenantConfig[directive])) {
            baseConfig[directive] = [...new Set([...baseConfig[directive], ...tenantConfig[directive]])];
          }
        }
      }
    }

    return baseConfig;
  }

  private getTenantDomains(tenantId: string, hostname: string): string[] {
    const domains = [];

    // نطاق المستأجر الرئيسي
    if (tenantId !== 'system') {
      domains.push(`https://${tenantId}.apex-platform.com`);
      domains.push(`https://admin.${tenantId}.apex-platform.com`);
    }

    // النطاق الحالي
    if (hostname) {
      domains.push(`https://${hostname}`);
    }

    // نطاقات إضافية من المتغيرات البيئية
    const additionalDomains = this.configService.get<string[]>('ADDITIONAL_CSP_DOMAINS', []);
    domains.push(...additionalDomains.map(domain => `https://${domain}`));

    return domains;
  }

  private getTenantCSPConfig(tenantId: string): any {
    // في الإصدار الحقيقي، سيتم جلب هذا من قاعدة البيانات أو ملف التكوين
    const tenantConfigs = {
      'premium-tenant': {
        scriptSrc: ['https://cdn.premium-widgets.com'],
        imgSrc: ['https://images.premium-content.com'],
        connectSrc: ['https://api.premium-services.com']
      }
    };

    return tenantConfigs[tenantId] || null;
  }

  validateCSPReport(report: any) {
    try {
      this.logger.warn(`[S8] تقرير انتهاك سياسة الأمان: ${JSON.stringify(report, null, 2)}`);

      // تحليل التقرير
      if (report['csp-report']) {
        const violation = report['csp-report'];
        const blockedUri = violation['blocked-uri'] || 'unknown';
        const violatedDirective = violation['violated-directive'] || 'unknown';

        this.logger.warn(`[S8] انتهاك CSP: ${violatedDirective} - ${blockedUri}`);

        // تحديد شدة الانتهاك
        let severity = 'LOW';
        if (blockedUri.includes('data:') || blockedUri.includes('blob:')) {
          severity = 'MEDIUM';
        }
        if (blockedUri.includes('script') || blockedUri.includes('eval')) {
          severity = 'HIGH';
        }
        if (blockedUri.startsWith('http') && !blockedUri.includes('apex-platform.com')) {
          severity = 'CRITICAL';
        }

        // هنا يمكن إرسال تنبيه أو اتخاذ إجراء بناءً على الشدة
        if (severity === 'CRITICAL') {
          this.logger.error(`[S8] 🚨 انتهاك CSP خطير: ${blockedUri}`);
          // this.securityAlertService.sendAlert('CRITICAL_CSP_VIOLATION', { report, severity });
        }
      }

      return { status: 'processed', severity: 'MEDIUM' };
    } catch (error) {
      this.logger.error(`[S8] ❌ خطأ في معالجة تقرير CSP: ${error.message}`);
      return { status: 'error', error: error.message };
    }
  }

  getReportUri(): string {
    return this.configService.get<string>('CSP_REPORT_URI', '/api/csp-report');
  }
}