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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerPlaytimeController = void 0;
const common_1 = require("@nestjs/common");
const player_playtime_service_1 = require("./player-playtime.service");
let PlayerPlaytimeController = class PlayerPlaytimeController {
    constructor(playtimeService) {
        this.playtimeService = playtimeService;
    }
    async getCurrentSession(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.playtimeService.getCurrentSession(playerId.trim(), clubId.trim());
    }
    async getSessionHistory(playerId, clubId, limit, offset) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        const limitNum = limit ? parseInt(limit, 10) : 20;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        return this.playtimeService.getSessionHistory(playerId.trim(), clubId.trim(), limitNum, offsetNum);
    }
    async startCallTime(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.playtimeService.startCallTime(playerId.trim(), clubId.trim(), body === null || body === void 0 ? void 0 : body.tableId);
    }
    async requestCashOut(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.playtimeService.requestCashOut(playerId.trim(), clubId.trim(), body === null || body === void 0 ? void 0 : body.amount);
    }
};
exports.PlayerPlaytimeController = PlayerPlaytimeController;
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerPlaytimeController.prototype, "getCurrentSession", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PlayerPlaytimeController.prototype, "getSessionHistory", null);
__decorate([
    (0, common_1.Post)('call-time'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PlayerPlaytimeController.prototype, "startCallTime", null);
__decorate([
    (0, common_1.Post)('cash-out'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PlayerPlaytimeController.prototype, "requestCashOut", null);
exports.PlayerPlaytimeController = PlayerPlaytimeController = __decorate([
    (0, common_1.Controller)('player-playtime'),
    __metadata("design:paramtypes", [player_playtime_service_1.PlayerPlaytimeService])
], PlayerPlaytimeController);
//# sourceMappingURL=player-playtime.controller.js.map