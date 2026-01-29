import { Injectable, Scope, Inject, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable({ scope: Scope.REQUEST })
export class TenantContextService {
  private readonly logger = new Logger(TenantContextService.name);
  private tenantId: string | null = null;
  private tenantSchema: string | null = null;
  private isSystemOperation = false;

  constructor(@Inject(REQUEST) private readonly request: Request) {
    this.initializeFromRequest();
  }

  private initializeFromRequest() {
    // استخراج tenantId من عدة مصادر
    this.tenantId =
      this.request?.headers?.['x-tenant-id']?.toString() ||
      this.request?.subdomains?.[0] ||
      this.extractFromHost() ||
      this.extractFromPath();

    if (this.tenantId) {
      this.tenantSchema = `tenant_${this.sanitizeTenantId(this.tenantId)}`;
      this.logger.debug(`[S2] تم تعيين سياق المستأجر: ${this.tenantId}`);
    } else {
      // عمليات النظام لا تحتوي على tenantId
      this.isSystemOperation = true;
      this.logger.debug('[S2] عملية نظام - لا يوجد مستأجر محدد');
    }
  }

  private extractFromHost(): string | null {
    const host = this.request?.hostname;
    if (!host) return null;
    const parts = host.split('.');

    // إذا كان النطاق تحت apex-platform.com
    if (parts.length > 2 && parts[parts.length - 2] === 'apex-platform' && parts[parts.length - 1] === 'com') {
      return parts[0];
    }
    return null;
  }

  private extractFromPath(): string | null {
    const path = this.request?.path;
    if (!path) return null;
    const match = path.match(/^\/([^\/]+)\/api\//);
    return match ? match[1] : null;
  }

  private sanitizeTenantId(tenantId: string): string {
    // تنظيف tenantId لمنع حقن SQL
    return tenantId.toLowerCase().replace(/[^a-z0-9-_]/g, '_');
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  getTenantSchema(): string | null {
    return this.tenantSchema;
  }

  isSystemContext(): boolean {
    return this.isSystemOperation;
  }

  /**
   * التحقق من صلاحية الوصول للمستأجر
   */
  validateTenantAccess(requestedTenantId: string): boolean {
    // السماح لعمليات النظام بالوصول إلى أي مستأجر
    if (this.isSystemOperation) {
      this.logger.warn(`[S2] ⚠️ عملية نظام تحاول الوصول إلى مستأجر: ${requestedTenantId}`);
      return true;
    }

    // التحقق من تطابق المستأجر
    const isValid = this.tenantId === requestedTenantId;

    if (!isValid) {
      this.logger.error(
        `[S2] 🚨 محاولة اختراق: المستأجر ${this.tenantId} يحاول الوصول إلى بيانات ${requestedTenantId}`
      );

      // تسجيل حدث أمني
      this.logSecurityIncident('TENANT_ISOLATION_VIOLATION', {
        currentTenant: this.tenantId,
        attemptedAccess: requestedTenantId,
        ip: this.request?.ip,
        userAgent: (this.request && typeof this.request.get === 'function') ? this.request.get('User-Agent') : 'unknown',
        timestamp: new Date().toISOString()
      });
    }

    return isValid;
  }

  public logSecurityIncident(type: string, details: any) {
    const incidentId = uuidv4();
    this.logger.error(`[S2] 🔒 حادث أمني [${incidentId}] - النوع: ${type}`);
    this.logger.error(JSON.stringify({
      incidentId,
      type,
      details,
      stack: new Error().stack
    }, null, 2));
  }

  /**
   * تعيين سياق المستأجر يدوياً (للعمليات النظامية)
   */
  forceTenantContext(tenantId: string) {
    this.tenantId = tenantId;
    this.tenantSchema = `tenant_${this.sanitizeTenantId(tenantId)}`;
    this.isSystemOperation = false;
    this.logger.warn(`[S2] ⚠️ تم تعيين سياق المستأجر يدوياً: ${tenantId}`);
  }

  /**
   * تفعيل سياق النظام يدوياً
   */
  forceSystemContext() {
    this.isSystemOperation = true;
    this.tenantId = 'system';
    this.tenantSchema = 'system_schema';
    this.logger.warn('[S2] ⚠️ تم تفعيل سياق النظام يدوياً');
  }
}