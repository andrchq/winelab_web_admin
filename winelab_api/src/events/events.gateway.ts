
import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService, JwtPayload } from '../auth/auth.service';

@WebSocketGateway({
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('EventsGateway');

    constructor(
        private readonly jwtService: JwtService,
        private readonly authService: AuthService,
    ) {}

    afterInit(server: Server) {
        this.logger.log('WebSocket Gateway Initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('ping')
    handlePing(@MessageBody() data: unknown): string {
        return 'pong';
    }

    @SubscribeMessage('auth:identify')
    async handleIdentify(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { token?: string },
    ) {
        const token = data?.token?.trim();
        if (!token) {
            return { ok: false };
        }

        try {
            const payload = this.jwtService.verify<JwtPayload>(token);
            const user = await this.authService.validateUser(payload);

            if (!user) {
                client.disconnect();
                return { ok: false };
            }

            client.join(`user:${user.id}`);
            if (user.role) {
                client.join(`role:${user.role}`);
            }
            if (user.role === 'WAREHOUSE' && user.warehouseId) {
                client.join(`warehouse:${user.warehouseId}:role:WAREHOUSE`);
            }

            return {
                ok: true,
                userId: user.id,
                role: user.role,
                warehouseId: user.warehouseId,
            };
        } catch (error) {
            this.logger.warn(`Socket identify failed for ${client.id}`);
            client.disconnect();
            return { ok: false };
        }
    }

    emitDashboardStats(stats: any) {
        this.server.emit('dashboard_stats', stats);
    }

    emitDeliveryUpdate(delivery: any) {
        this.server.emit('delivery_update', delivery);
    }
}
