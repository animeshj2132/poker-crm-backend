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
exports.PlayerVipController = void 0;
const common_1 = require("@nestjs/common");
const player_vip_service_1 = require("./player-vip.service");
let PlayerVipController = class PlayerVipController {
    constructor(vipService) {
        this.vipService = vipService;
    }
    async getVipPoints(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.vipService.getVipPoints(playerId.trim(), clubId.trim());
    }
    async getClubPoints(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.vipService.getClubPoints(playerId.trim(), clubId.trim());
    }
    async getAvailableRewards(clubId) {
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.vipService.getAvailableRewards(clubId.trim());
    }
    async redeemPoints(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!(body === null || body === void 0 ? void 0 : body.rewardId)) {
            throw new common_1.BadRequestException('rewardId is required');
        }
        if (!(body === null || body === void 0 ? void 0 : body.pointsToRedeem) || typeof body.pointsToRedeem !== 'number') {
            throw new common_1.BadRequestException('pointsToRedeem is required and must be a number');
        }
        return this.vipService.redeemPoints(playerId.trim(), clubId.trim(), body.rewardId, body.pointsToRedeem);
    }
};
exports.PlayerVipController = PlayerVipController;
__decorate([
    (0, common_1.Get)('points'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerVipController.prototype, "getVipPoints", null);
__decorate([
    (0, common_1.Get)('club-points'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerVipController.prototype, "getClubPoints", null);
__decorate([
    (0, common_1.Get)('rewards'),
    __param(0, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PlayerVipController.prototype, "getAvailableRewards", null);
__decorate([
    (0, common_1.Post)('redeem'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PlayerVipController.prototype, "redeemPoints", null);
exports.PlayerVipController = PlayerVipController = __decorate([
    (0, common_1.Controller)('player-vip'),
    __metadata("design:paramtypes", [player_vip_service_1.PlayerVipService])
], PlayerVipController);
//# sourceMappingURL=player-vip.controller.js.map