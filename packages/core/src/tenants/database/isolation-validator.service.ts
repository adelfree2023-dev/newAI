import { Injectable, Logger } from '@nestjs/common';
import { VercelAgentFactory } from '../../security/ai-supervisor/vercel-integration/vercel-agent-factory';
import { AuditService } from '../../security/layers/s4-audit-logging/audit.service';
import { EncryptionService } from '../../security/layers/s7-encryption/encryption.service';

@Injectable()
export class IsolationValidatorService {
  private readonly logger = new Logger(IsolationValidatorService.name);

  constructor(
    private readonly vercelAgentFactory: VercelAgentFactory,
    private readonly auditService: AuditService,
    private readonly encryptionService: EncryptionService
  ) {}

  async validateQuery(query: string, tenantId: string | null, isSystemOperation: boolean): Promise<boolean> {
    this.logger.debug(`[M2] 🔍 التحقق من أمان الاستعلام: ${query.substring(0, 100)}...`);
    
    try {
      // التحقق الأساسي من الاستعلام
      const basicValidation = this.performBasicValidation(query, tenantId, isSystemOperation);
      if (!basicValidation.isValid) {
        await this.logValidationFailure('BASIC_VALIDATION_FAILED', basicValidation.reason, query, tenantId);
        return false;
      }
      
      // التحقق المتقدم باستخدام الذكاء الاصطناعي
      const aiValidation = await this.performAIValidation(query, tenantId, isSystemOperation);
      
      if (!aiValidation.isSecure) {
        await this.logValidationFailure(
          aiValidation.issueType || 'AI_DETECTED_THREAT',
          aiValidation.description || 'استعلام يحتمل كونه خطيراً',
          query,
          tenantId,
          aiValidation
        );
        return false;
      }
      
      this.logger.debug(`[M2] ✅ نجاح التحقق من أمان الاستعلام`);
      return true;
    } catch (error) {
      this.logger.error(`[M2] ❌ خطأ في التحقق من أمان الاستعلام: ${error.message}`);
      
      // في حالة الخطأ، رفض الاستعلام للسلامة
      await this.logValidationFailure('VALIDATION_ERROR', error.message, query, tenantId);
      return false;
    }
  }

  private performBasicValidation(query: string, tenantId: string | null, isSystemOperation: boolean): { isValid: boolean; reason?: string } {
    const lowerQuery = query.toLowerCase().trim();
    
    // 1. منع الوصول إلى جداول النظام
    const systemTables = ['pg_catalog', 'information_schema', 'pg_class', 'pg_namespace', 'pg_roles'];
    for (const table of systemTables) {
      if (lowerQuery.includes(table)) {
        return { isValid: false, reason: `محاولة الوصول إلى جداول النظام: ${table}` };
      }
    }
    
    // 2. منع أوامر SQL خطيرة
    const dangerousCommands = ['drop schema', 'drop database', 'drop table', 'truncate', 'delete from', 'alter'];
    for (const command of dangerousCommands) {
      if (lowerQuery.startsWith(command) && !isSystemOperation) {
        return { isValid: false, reason: `أمر SQL خطير غير مصرح به: ${command}` };
      }
    }
    
    // 3. منع الوصول إلى مخططات مستأجرين آخرين
    if (tenantId && !isSystemOperation) {
      const schemaPattern = /"tenant_[a-z0-9_-]+"\.|tenant_[a-z0-9_-]+\./g;
      const matches = lowerQuery.match(schemaPattern) || [];
      
      for (const match of matches) {
        const schemaName = match.replace(/[".]/g, '').trim();
        if (schemaName !== `tenant_${tenantId}`) {
          return { isValid: false, reason: `محاولة الوصول إلى مخطط مستأجر آخر: ${schemaName}` };
        }
      }
    }
    
    // 4. منع حقن SQL
    const sqlInjectionPatterns = [
      /';\s*--/g, // تعليق SQL
      /union\s+select/g, // UNION attack
      /' or 1=1/g, // Boolean-based
      /";\s*$/g, // نهاية مفاجئة
      /eval\s*\(/g, // JavaScript injection
      /exec\s*\(/g // Command execution
    ];
    
    for (const pattern of sqlInjectionPatterns) {
      if (pattern.test(query)) {
        return { isValid: false, reason: 'كشف نمط حقن SQL محتمل' };
      }
    }
    
    return { isValid: true };
  }

  private async performAIValidation(query: string, tenantId: string | null, isSystemOperation: boolean): Promise<any> {
    try {
      // جمع سياق للذكاء الاصطناعي
      const contextData = {
        query,
        tenantId,
        isSystemOperation,
        operationType: this.determineOperationType(query),
        sensitivePatterns: this.extractSensitivePatterns(query),
        complexityScore: this.calculateQueryComplexity(query)
      };
      
      // استخدام المهارة المناسبة
      const result = await this.vercelAgentFactory.validateDatabaseIsolation({
        tenantId: tenantId || 'system',
        schemaName: isSystemOperation ? 'system_schema' : `tenant_${tenantId}`,
        operationType: contextData.operationType,
        contextData
      });
      
      return {
        isSecure: result.isolationStatus === 'SECURE',
        issueType: result.detectedIssues?.[0]?.issueType,
        description: result.detectedIssues?.[0]?.description,
        severity: result.threatLevel,
        confidence: result.confidence,
        recommendedActions: result.recommendedActions
      };
    } catch (error) {
      this.logger.error(`[M2] ❌ فشل التحقق باستخدام الذكاء الاصطناعي: ${error.message}`);
      
      // في حالة فشل الذكاء الاصطناعي، نستخدم التحقق الأساسي فقط
      return { isSecure: true, confidence: 0.5 };
    }
  }

  private determineOperationType(query: string): string {
    const lowerQuery = query.toLowerCase().trim();
    
    if (lowerQuery.startsWith('select')) return 'READ';
    if (lowerQuery.startsWith('insert')) return 'CREATE';
    if (lowerQuery.startsWith('update')) return 'UPDATE';
    if (lowerQuery.startsWith('delete')) return 'DELETE';
    if (lowerQuery.includes('join') || lowerQuery.includes('union')) return 'COMPLEX_READ';
    
    return 'OTHER';
  }

  private extractSensitivePatterns(query: string): string[] {
    const sensitiveKeywords = [
      'password', 'secret', 'token', 'key', 'auth', 'credential',
      'credit', 'card', 'cvv', 'ssn', 'social', 'security',
      'email', 'phone', 'address', 'financial'
    ];
    
    const lowerQuery = query.toLowerCase();
    return sensitiveKeywords.filter(keyword => lowerQuery.includes(keyword));
  }

  private calculateQueryComplexity(query: string): number {
    // حساب تعقيد الاستعلام بناءً على عدة عوامل
    let complexity = 1;
    
    // عدد الكلمات المفتاحية
    const keywords = query.match(/\b(select|from|where|join|group by|order by|union|insert|update|delete|create|drop|alter)\b/gi) || [];
    complexity += keywords.length * 0.5;
    
    // عدد الجداول
    const tables = query.match(/from\s+(\w+)|join\s+(\w+)/gi) || [];
    complexity += tables.length * 2;
    
    // وجود دوال
    if (query.toLowerCase().includes('function')) complexity += 5;
    
    // وجود استعلامات متداخلة
    if (query.includes('(') && query.includes(')')) complexity += 3;
    
    return Math.min(10, complexity); // حد أقصى 10
  }

  private async logValidationFailure(
    issueType: string,
    reason: string,
    query: string,
    tenantId: string | null,
    aiDetails?: any
  ) {
    this.logger.error(`[M2] 🔴 فشل التحقق: ${issueType} - ${reason}`);
    
    // تسجيل حدث أمني
    await this.auditService.logSecurityEvent('QUERY_VALIDATION_FAILURE', {
      issueType,
      reason,
      query: this.maskSensitiveData(query),
      tenantId,
      aiDetails,
      timestamp: new Date().toISOString(),
      severity: aiDetails?.severity || 'MEDIUM'
    });
  }

  private maskSensitiveData(query: string): string {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/credit_card\s*=\s*'[^']*'/gi, "credit_card = '[REDACTED]'");
  }

  async validateIsolation(isolationData: any): Promise<{ isSecure: boolean; issueType?: string; description?: string; severity?: string }> {
    try {
      const result = await this.vercelAgentFactory.validateDatabaseIsolation(isolationData);
      
      return {
        isSecure: result.isolationStatus === 'SECURE',
        issueType: result.detectedIssues?.[0]?.issueType,
        description: result.detectedIssues?.[0]?.description,
        severity: result.threatLevel
      };
    } catch (error) {
      this.logger.error(`[M2] ❌ فشل التحقق من العزل: ${error.message}`);
      return { isSecure: false, issueType: 'VALIDATION_ERROR', description: error.message, severity: 'HIGH' };
    }
  }
}