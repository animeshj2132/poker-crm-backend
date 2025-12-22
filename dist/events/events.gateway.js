"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const events_service_1 = require("./events.service");
let EventsGateway = EventsGateway_1 = class EventsGateway {
    constructor(eventsService) {
        this.eventsService = eventsService;
        this.logger = new common_1.Logger(EventsGateway_1.name);
    }
    afterInit(server) {
        this.eventsService.setServer(server);
        this.logger.log('WebSocket Gateway initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        this.eventsService.removeClient(client.id);
    }
    handleSubscribeClub(client, data) {
        if (!data || !data.clubId) {
            client.emit('error', { message: 'Club ID is required' });
            return;
        }
        this.logger.log(`Client ${client.id} subscribing to club ${data.clubId}`);
        this.eventsService.subscribeToClub(client.id, data.clubId, data.playerId);
        client.emit('subscribed', { clubId: data.clubId });
    }
    handleSubscribePlayer(client, data) {
        if (!data || !data.playerId || !data.clubId) {
            client.emit('error', { message: 'Player ID and Club ID are required' });
            return;
        }
        this.logger.log(`Client ${client.id} subscribing to player ${data.playerId}`);
        this.eventsService.subscribeToPlayer(client.id, data.playerId, data.clubId);
        client.emit('subscribed', { playerId: data.playerId, clubId: data.clubId });
    }
    handleUnsubscribeClub(client, data) {
        if (data && data.clubId) {
            this.eventsService.unsubscribeFromClub(client.id, data.clubId);
            client.emit('unsubscribed', { clubId: data.clubId });
        }
    }
    handleUnsubscribePlayer(client, data) {
        if (data && data.playerId) {
            this.eventsService.unsubscribeFromPlayer(client.id, data.playerId);
            client.emit('unsubscribed', { playerId: data.playerId });
        }
    }
};
exports.EventsGateway = EventsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], EventsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:club'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSubscribeClub", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('subscribe:player'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleSubscribePlayer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:club'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleUnsubscribeClub", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('unsubscribe:player'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], EventsGateway.prototype, "handleUnsubscribePlayer", null);
exports.EventsGateway = EventsGateway = EventsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: [
                'http://localhost:3000',
                'http://localhost:8080',
                'http://localhost:8081',
                'http://localhost:8082',
                'http://localhost:8083',
                'http://localhost:8084',
                'http://localhost:8085',
                'http://localhost:8086',
                'http://localhost:8087',
                'http://localhost:8088',
                'http://localhost:8089',
                'http://localhost:8090'
            ],
            credentials: true
        },
        namespace: '/realtime'
    }),
    __metadata("design:paramtypes", [events_service_1.EventsService])
], EventsGateway);
//# sourceMappingURL=events.gateway.js.map