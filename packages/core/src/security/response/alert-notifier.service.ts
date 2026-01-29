import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../layers/s4-audit-logging/audit.service';
import { TenantContextService } from '../layers/s2-tenant-isolation/tenant-context.service';
import { EncryptionService } from '../layers/s7-encryption/encryption.service';
import * as nodemailer from 'nodemailer';
import * as AWS from 'aws-sdk';

@Injectable()
export class AlertNotifierService {
    private readonly logger = new Logger(AlertNotifierService.name);
    private emailEnabled: boolean;
    private smsEnabled: boolean;
    private slackEnabled: boolean;
    private telegramEnabled: boolean;
    private emailTransporter: nodemailer.Transporter;
    private sns: AWS.SNS;
    private readonly adminEmails: string[];
    private readonly adminPhones: string[];
    private readonly slackWebhook: string;
    private readonly telegramBotToken: string;
    private readonly telegramChatId: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly auditService: AuditService,
        private readonly tenantContext: TenantContextService,
        private readonly encryptionService: EncryptionService
    ) {
        this.emailEnabled = this.configService.get<boolean>('ALERT_EMAIL_ENABLED', false);
        this.smsEnabled = this.configService.get<boolean>('ALERT_SMS_ENABLED', false);
        this.slackEnabled = this.configService.get<boolean>('ALERT_SLACK_ENABLED', false);
        this.telegramEnabled = this.configService.get<boolean>('ALERT_TELEGRAM_ENABLED', false);

        this.adminEmails = this.configService.get<string>('ADMIN_EMAILS', '').split(',').filter(e => e.trim());
        this.adminPhones = this.configService.get<string>('ADMIN_PHONES', '').split(',').filter(p => p.trim());
        this.slackWebhook = this.configService.get<string>('SLACK_WEBHOOK_URL', '');
        this.telegramBotToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN', '');
        this.telegramChatId = this.configService.get<string>('TELEGRAM_CHAT_ID', '');

        if (this.emailEnabled) {
            this.initializeEmailTransporter();
        }

        if (this.smsEnabled) {
            this.initializeSNS();
        }
    }

    private initializeEmailTransporter() {
        const smtpHost = this.configService.get<string>('SMTP_HOST');
        const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
        const smtpUser = this.configService.get<string>('SMTP_USER');
        const smtpPass = this.configService.get<string>('SMTP_PASS');

        if (!smtpHost || !smtpUser || !smtpPass) {
            this.logger.warn('[M4] ⚠️ SMTP credentials not configured. Email alerts will be disabled.');
            this.emailEnabled = false;
            return;
        }

        this.emailTransporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
                user: smtpUser,
                pass: smtpPass
            }
        });

        this.logger.log('[M4] ✅ Email transporter initialized');
    }

    private initializeSNS() {
        const awsRegion = this.configService.get<string>('AWS_REGION', 'us-east-1');
        const awsAccessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
        const awsSecretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

        if (!awsAccessKeyId || !awsSecretAccessKey) {
            this.logger.warn('[M4] ⚠️ AWS credentials not configured. SMS alerts will be disabled.');
            this.smsEnabled = false;
            return;
        }

        AWS.config.update({
            region: awsRegion,
            accessKeyId: awsAccessKeyId,
            secretAccessKey: awsSecretAccessKey
        });

        this.sns = new AWS.SNS();
        this.logger.log('[M4] ✅ SNS client initialized');
    }

    /**
     * إرسال تنبيه متعدد القنوات
     */
    async sendMultiChannelAlert(alertData: {
        severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
        title: string;
        message: string;
        eventType: string;
        tenantId?: string;
        userId?: string;
        ipAddress?: string;
        details?: any;
    }): Promise<void> {
        try {
            this.logger.warn(`[M4] 📢 إرسال تنبيه ${alertData.severity}: ${alertData.title}`);

            // تسجيل التنبيه في السجلات
            await this.auditService.logSecurityEvent('ALERT_SENT', {
                ...alertData,
                channels: [],
                timestamp: new Date().toISOString()
            });

            // إرسال عبر القنوات الممكنة
            const promises: Promise<void>[] = [];

            if (this.emailEnabled && alertData.severity !== 'LOW') {
                promises.push(this.sendEmailAlert(alertData));
            }

            if (this.smsEnabled && (alertData.severity === 'CRITICAL' || alertData.severity === 'HIGH')) {
                promises.push(this.sendSmsAlert(alertData));
            }

            if (this.slackEnabled && alertData.severity !== 'LOW') {
                promises.push(this.sendSlackAlert(alertData));
            }

            if (this.telegramEnabled && alertData.severity !== 'LOW') {
                promises.push(this.sendTelegramAlert(alertData));
            }

            await Promise.all(promises);

            this.logger.log(`[M4] ✅ تم إرسال التنبيه عبر ${promises.length} قناة`);

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إرسال التنبيه: ${error.message}`);
            await this.auditService.logSecurityEvent('ALERT_SEND_FAILURE', {
                alertData,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * إرسال تنبيه عبر البريد الإلكتروني
     */
    private async sendEmailAlert(alertData: any): Promise<void> {
        try {
            const subject = `[${alertData.severity}] ${alertData.title} - Apex Platform Security Alert`;

            const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #${this.getSeverityColor(alertData.severity)};">
          <h1 style="color: #${this.getSeverityColor(alertData.severity)};">🚨 ${alertData.severity} Security Alert</h1>
          <h2>${alertData.title}</h2>
          <p><strong>Event Type:</strong> ${alertData.eventType}</p>
          <p><strong>Message:</strong> ${alertData.message}</p>
          ${alertData.tenantId ? `<p><strong>Tenant ID:</strong> ${alertData.tenantId}</p>` : ''}
          ${alertData.userId ? `<p><strong>User ID:</strong> ${alertData.userId}</p>` : ''}
          ${alertData.ipAddress ? `<p><strong>IP Address:</strong> ${alertData.ipAddress}</p>` : ''}
          ${alertData.details ? `<div style="background: #f5f5f5; padding: 15px; margin-top: 20px; border-radius: 5px;">
            <h3>Details:</h3>
            <pre style="font-size: 12px; overflow-x: auto;">${JSON.stringify(alertData.details, null, 2)}</pre>
          </div>` : ''}
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 12px;">
              Alert generated at: ${new Date().toISOString()}<br>
              System: Apex Platform Security Monitoring<br>
              Severity: ${alertData.severity}
            </p>
          </div>
        </div>
      `;

            const mailOptions = {
                from: this.configService.get<string>('ALERT_FROM_EMAIL', 'security@apex-platform.com'),
                to: this.adminEmails.join(','),
                subject: subject,
                html: htmlContent
            };

            await this.emailTransporter.sendMail(mailOptions);

            this.logger.log(`[M4] ✅ تم إرسال تنبيه بريد إلكتروني: ${subject}`);

            await this.auditService.logSecurityEvent('EMAIL_ALERT_SENT', {
                subject,
                recipients: this.adminEmails,
                severity: alertData.severity,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إرسال تنبيه بريد إلكتروني: ${error.message}`);
            throw error;
        }
    }

    /**
     * إرسال تنبيه عبر SMS
     */
    private async sendSmsAlert(alertData: any): Promise<void> {
        try {
            const message = `[${alertData.severity}] ${alertData.title}: ${alertData.message} - Apex Security`;

            const promises = this.adminPhones.map(phone => {
                return this.sns.publish({
                    Message: message,
                    PhoneNumber: phone.trim()
                }).promise();
            });

            await Promise.all(promises);

            this.logger.log(`[M4] ✅ تم إرسال ${this.adminPhones.length} تنبيهات SMS`);

            await this.auditService.logSecurityEvent('SMS_ALERT_SENT', {
                message,
                recipientCount: this.adminPhones.length,
                severity: alertData.severity,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إرسال تنبيهات SMS: ${error.message}`);
            throw error;
        }
    }

    /**
     * إرسال تنبيه عبر Slack
     */
    private async sendSlackAlert(alertData: any): Promise<void> {
        try {
            const severityEmoji = {
                'CRITICAL': '🔴',
                'HIGH': '🟠',
                'MEDIUM': '🟡',
                'LOW': '🟢'
            };

            const payload = {
                text: `${severityEmoji[alertData.severity]} **${alertData.severity} Security Alert**`,
                blocks: [
                    {
                        type: 'header',
                        text: {
                            type: 'plain_text',
                            text: `${severityEmoji[alertData.severity]} ${alertData.severity} Security Alert`,
                            emoji: true
                        }
                    },
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*${alertData.title}*\n${alertData.message}`
                        }
                    },
                    {
                        type: 'section',
                        fields: [
                            {
                                type: 'mrkdwn',
                                text: `*Event Type:*\n${alertData.eventType}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Severity:*\n${alertData.severity}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*Tenant ID:*\n${alertData.tenantId || 'N/A'}`
                            },
                            {
                                type: 'mrkdwn',
                                text: `*IP Address:*\n${alertData.ipAddress || 'N/A'}`
                            }
                        ]
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                text: `Alert generated at ${new Date().toISOString()} | Apex Platform Security`
                            }
                        ]
                    }
                ]
            };

            const response = await fetch(this.slackWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Slack API returned ${response.status}`);
            }

            this.logger.log('[M4] ✅ تم إرسال تنبيه Slack');

            await this.auditService.logSecurityEvent('SLACK_ALERT_SENT', {
                severity: alertData.severity,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إرسال تنبيه Slack: ${error.message}`);
            throw error;
        }
    }

    /**
     * إرسال تنبيه عبر Telegram
     */
    private async sendTelegramAlert(alertData: any): Promise<void> {
        try {
            const severityEmoji = {
                'CRITICAL': '🔴',
                'HIGH': '🟠',
                'MEDIUM': '🟡',
                'LOW': '🟢'
            };

            const message = `
${severityEmoji[alertData.severity]} *${alertData.severity} Security Alert*

*${alertData.title}*
${alertData.message}

*Event Type:* ${alertData.eventType}
*Severity:* ${alertData.severity}
*Tenant ID:* ${alertData.tenantId || 'N/A'}
*IP Address:* ${alertData.ipAddress || 'N/A'}
*Time:* ${new Date().toISOString()}
      `.trim();

            const response = await fetch(
                `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: this.telegramChatId,
                        text: message,
                        parse_mode: 'Markdown'
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Telegram API returned ${response.status}`);
            }

            this.logger.log('[M4] ✅ تم إرسال تنبيه Telegram');

            await this.auditService.logSecurityEvent('TELEGRAM_ALERT_SENT', {
                severity: alertData.severity,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إرسال تنبيه Telegram: ${error.message}`);
            throw error;
        }
    }

    /**
     * الحصول على لون بناءً على مستوى الخطورة
     */
    private getSeverityColor(severity: string): string {
        const colors = {
            'CRITICAL': 'ff0000',
            'HIGH': 'ff6600',
            'MEDIUM': 'ffcc00',
            'LOW': '33cc33'
        };
        return colors[severity as keyof typeof colors] || '666666';
    }

    /**
     * إرسال تنبيه اختبار
     */
    async sendTestAlert(): Promise<void> {
        try {
            this.logger.log('[M4] 🧪 إرسال تنبيه اختباري...');

            await this.sendMultiChannelAlert({
                severity: 'MEDIUM',
                title: 'Test Alert - Apex Platform',
                message: 'This is a test alert to verify notification channels are working correctly.',
                eventType: 'TEST_ALERT',
                details: {
                    testTime: new Date().toISOString(),
                    channels: {
                        email: this.emailEnabled,
                        sms: this.smsEnabled,
                        slack: this.slackEnabled,
                        telegram: this.telegramEnabled
                    }
                }
            });

            this.logger.log('[M4] ✅ تم إرسال تنبيه الاختبار بنجاح');

        } catch (error) {
            this.logger.error(`[M4] ❌ فشل إرسال تنبيه الاختبار: ${error.message}`);
            throw error;
        }
    }

    /**
     * الحصول على حالة القنوات
     */
    getChannelStatus(): any {
        return {
            email: { enabled: this.emailEnabled, recipients: this.adminEmails.length },
            sms: { enabled: this.smsEnabled, recipients: this.adminPhones.length },
            slack: { enabled: this.slackEnabled, configured: !!this.slackWebhook },
            telegram: { enabled: this.telegramEnabled, configured: !!this.telegramBotToken },
            timestamp: new Date().toISOString()
        };
    }
}
