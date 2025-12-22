"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
let EventsService = EventsService_1 = class EventsService {
    constructor() {
        this.logger = new common_1.Logger(EventsService_1.name);
        this.clientSubscriptions = new Map();
        this.clubSubscriptions = new Map();
        this.playerSubscriptions = new Map();
    }
    setServer(server) {
        this.server = server;
    }
    subscribeToClub(clientId, clubId, playerId) {
        if (!this.clientSubscriptions.has(clientId)) {
            this.clientSubscriptions.set(clientId, new Set());
        }
        this.clientSubscriptions.get(clientId).add(`club:${clubId}`);
        if (playerId) {
            this.clientSubscriptions.get(clientId).add(`player:${playerId}`);
        }
        if (!this.clubSubscriptions.has(clubId)) {
            this.clubSubscriptions.set(clubId, new Set());
        }
        this.clubSubscriptions.get(clubId).add(clientId);
        if (playerId) {
            if (!this.playerSubscriptions.has(playerId)) {
                this.playerSubscriptions.set(playerId, new Set());
            }
            this.playerSubscriptions.get(playerId).add(clientId);
        }
    }
    subscribeToPlayer(clientId, playerId, clubId) {
        if (!this.clientSubscriptions.has(clientId)) {
            this.clientSubscriptions.set(clientId, new Set());
        }
        this.clientSubscriptions.get(clientId).add(`player:${playerId}`);
        this.clientSubscriptions.get(clientId).add(`club:${clubId}`);
        if (!this.playerSubscriptions.has(playerId)) {
            this.playerSubscriptions.set(playerId, new Set());
        }
        this.playerSubscriptions.get(playerId).add(clientId);
        if (!this.clubSubscriptions.has(clubId)) {
            this.clubSubscriptions.set(clubId, new Set());
        }
        this.clubSubscriptions.get(clubId).add(clientId);
    }
    unsubscribeFromClub(clientId, clubId) {
        const subscriptions = this.clientSubscriptions.get(clientId);
        if (subscriptions) {
            subscriptions.delete(`club:${clubId}`);
        }
        const clubClients = this.clubSubscriptions.get(clubId);
        if (clubClients) {
            clubClients.delete(clientId);
            if (clubClients.size === 0) {
                this.clubSubscriptions.delete(clubId);
            }
        }
    }
    unsubscribeFromPlayer(clientId, playerId) {
        const subscriptions = this.clientSubscriptions.get(clientId);
        if (subscriptions) {
            subscriptions.delete(`player:${playerId}`);
        }
        const playerClients = this.playerSubscriptions.get(playerId);
        if (playerClients) {
            playerClients.delete(clientId);
            if (playerClients.size === 0) {
                this.playerSubscriptions.delete(playerId);
            }
        }
    }
    removeClient(clientId) {
        const subscriptions = this.clientSubscriptions.get(clientId);
        if (subscriptions) {
            subscriptions.forEach(sub => {
                if (sub.startsWith('club:')) {
                    const clubId = sub.replace('club:', '');
                    this.unsubscribeFromClub(clientId, clubId);
                }
                else if (sub.startsWith('player:')) {
                    const playerId = sub.replace('player:', '');
                    this.unsubscribeFromPlayer(clientId, playerId);
                }
            });
        }
        this.clientSubscriptions.delete(clientId);
    }
    emitTableStatusChange(clubId, table) {
        const clients = this.clubSubscriptions.get(clubId);
        if (clients && clients.size > 0) {
            this.server.emit('table:status-changed', {
                clubId,
                table: {
                    id: table.id,
                    tableNumber: table.tableNumber,
                    tableType: table.tableType,
                    maxSeats: table.maxSeats,
                    currentSeats: table.currentSeats,
                    availableSeats: table.maxSeats - table.currentSeats,
                    status: table.status,
                    minBuyIn: Number(table.minBuyIn) || 0,
                    maxBuyIn: Number(table.maxBuyIn) || 0
                }
            });
            this.logger.log(`Emitted table status change for club ${clubId} to ${clients.size} clients`);
        }
    }
    emitTablesUpdated(clubId, tables) {
        const clients = this.clubSubscriptions.get(clubId);
        if (clients && clients.size > 0) {
            this.server.emit('tables:updated', {
                clubId,
                tables: tables.map(t => ({
                    id: t.id,
                    tableNumber: t.tableNumber,
                    tableType: t.tableType,
                    maxSeats: t.maxSeats,
                    currentSeats: t.currentSeats,
                    availableSeats: t.maxSeats - t.currentSeats,
                    status: t.status,
                    minBuyIn: Number(t.minBuyIn) || 0,
                    maxBuyIn: Number(t.maxBuyIn) || 0
                }))
            });
            this.logger.log(`Emitted tables updated for club ${clubId} to ${clients.size} clients`);
        }
    }
    emitCreditRequestStatusChange(playerId, clubId, request) {
        const clients = this.playerSubscriptions.get(playerId);
        if (clients && clients.size > 0) {
            clients.forEach(clientId => {
                this.server.to(clientId).emit('credit:status-changed', {
                    playerId,
                    clubId,
                    request: {
                        id: request.id,
                        amount: Number(request.amount),
                        status: request.status,
                        limit: Number(request.limit) || 0,
                        createdAt: request.createdAt,
                        updatedAt: request.updatedAt
                    }
                });
            });
            this.logger.log(`Emitted credit status change for player ${playerId} to ${clients.size} clients`);
        }
    }
    emitWaitlistPositionUpdate(playerId, clubId, position, totalInQueue, entry) {
        const clients = this.playerSubscriptions.get(playerId);
        if (clients && clients.size > 0) {
            clients.forEach(clientId => {
                this.server.to(clientId).emit('waitlist:position-updated', {
                    playerId,
                    clubId,
                    position,
                    totalInQueue,
                    entry: {
                        id: entry.id,
                        status: entry.status,
                        tableNumber: entry.tableNumber,
                        tableType: entry.tableType
                    }
                });
            });
            this.logger.log(`Emitted waitlist position update for player ${playerId} to ${clients.size} clients`);
        }
    }
    emitWaitlistStatusChange(playerId, clubId, entry) {
        const clients = this.playerSubscriptions.get(playerId);
        if (clients && clients.size > 0) {
            clients.forEach(clientId => {
                this.server.to(clientId).emit('waitlist:status-changed', {
                    playerId,
                    clubId,
                    entry: {
                        id: entry.id,
                        status: entry.status,
                        tableNumber: entry.tableNumber,
                        tableType: entry.tableType,
                        createdAt: entry.createdAt
                    }
                });
            });
            this.logger.log(`Emitted waitlist status change for player ${playerId} to ${clients.size} clients`);
        }
    }
    emitTableAvailableNotification(clubId, table) {
        const clients = this.clubSubscriptions.get(clubId);
        if (clients && clients.size > 0) {
            this.server.emit('table:available', {
                clubId,
                table: {
                    id: table.id,
                    tableNumber: table.tableNumber,
                    tableType: table.tableType,
                    availableSeats: table.maxSeats - table.currentSeats
                }
            });
            this.logger.log(`Emitted table available notification for club ${clubId} to ${clients.size} clients`);
        }
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)()
], EventsService);
//# sourceMappingURL=events.service.js.map