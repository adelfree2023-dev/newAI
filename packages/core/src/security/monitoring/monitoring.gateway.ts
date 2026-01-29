import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SecurityMonitoringService } from './security-monitoring.service';

@WebSocketGateway({ namespace: '/security-monitoring', cors: true })
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(MonitoringGateway.name);
    @WebSocketServer() server: Server;
    private clients = new Map<string, { socket: Socket; tenantId?: string }>();

    constructor(
        private readonly monitoringService: SecurityMonitoringService
    ) { }

    handleConnection(client: Socket) {
        this.logger.log(`[M4] 🔌 اتصال عميل جديد: ${client.id}`);
        this.clients.set(client.id, { socket: client });

        // إرسال حالة المراقبة الحالية
        this.sendMonitoringStatus(client);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`[M4] 🔌 انقطاع عميل: ${client.id}`);
        this.clients.delete(client.id);
    }

    @SubscribeMessage('subscribe')
    handleSubscribe(client: Socket, payload: { tenantId?: string }) {
        const clientData = this.clients.get(client.id);
        if (clientData) {
            clientData.tenantId = payload.tenantId;
            this.logger.log(`[M4] ✅ اشتراك العميل ${client.id} في مراقبة المستأجر: ${payload.tenantId}`);
        }
    }

    /**
     * إرسال تنبيه أمني للعملاء
     */
    sendSecurityAlert(alert: any) {
        this.logger.warn(`[M4] 📢 إرسال تنبيه أمني لـ ${this.clients.size} عميل`);

        this.clients.forEach(({ socket, tenantId }) => {
            // إرسال التنبيه فقط للعملاء المشتركين في نفس المستأجر
            if (!tenantId || tenantId === alert.tenantId) {
                socket.emit('security-alert', alert);
            }
        });
    }

    /**
     * إرسال تحديث حالة المراقبة
     */
    sendMonitoringStatus(client?: Socket) {
        const status = this.monitoringService.getMonitoringStatus();

        if (client) {
            client.emit('monitoring-status', status);
        } else {
            this.clients.forEach(({ socket }) => {
                socket.emit('monitoring-status', status);
            });
        }
    }

    /**
     * إرسال تحديث الأداء
     */
    sendPerformanceUpdate(metrics: any) {
        this.clients.forEach(({ socket }) => {
            socket.emit('performance-update', metrics);
        });
    }

    /**
     * الحصول على عدد العملاء المتصلين
     */
    getClientCount(): number {
        return this.clients.size;
    }
}
