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
exports.PlayerOffersController = void 0;
const common_1 = require("@nestjs/common");
const player_offers_service_1 = require("./player-offers.service");
let PlayerOffersController = class PlayerOffersController {
    constructor(offersService) {
        this.offersService = offersService;
    }
    async getActiveOffers(playerId, clubId) {
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.offersService.getActiveOffers(clubId.trim(), playerId === null || playerId === void 0 ? void 0 : playerId.trim());
    }
    async recordOfferView(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!(body === null || body === void 0 ? void 0 : body.offerId)) {
            throw new common_1.BadRequestException('offerId is required');
        }
        return this.offersService.recordOfferView(body.offerId, playerId.trim(), clubId.trim());
    }
    async claimOffer(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!(body === null || body === void 0 ? void 0 : body.offerId)) {
            throw new common_1.BadRequestException('offerId is required');
        }
        return this.offersService.claimOffer(body.offerId, playerId.trim(), clubId.trim());
    }
};
exports.PlayerOffersController = PlayerOffersController;
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerOffersController.prototype, "getActiveOffers", null);
__decorate([
    (0, common_1.Post)('view'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PlayerOffersController.prototype, "recordOfferView", null);
__decorate([
    (0, common_1.Post)('claim'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PlayerOffersController.prototype, "claimOffer", null);
exports.PlayerOffersController = PlayerOffersController = __decorate([
    (0, common_1.Controller)('player-offers'),
    __metadata("design:paramtypes", [player_offers_service_1.PlayerOffersService])
], PlayerOffersController);
//# sourceMappingURL=player-offers.controller.js.map