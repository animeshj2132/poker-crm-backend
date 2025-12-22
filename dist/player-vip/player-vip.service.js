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
exports.PlayerVipService = exports.VIP_TIERS = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_service_1 = require("../clubs/clubs.service");
exports.VIP_TIERS = [
    { name: 'Bronze', minPoints: 0, multiplier: 1.0 },
    { name: 'Silver', minPoints: 1000, multiplier: 1.2 },
    { name: 'Gold', minPoints: 5000, multiplier: 1.5 },
    { name: 'Platinum', minPoints: 15000, multiplier: 2.0 },
    { name: 'Diamond', minPoints: 50000, multiplier: 3.0 },
];
let PlayerVipService = class PlayerVipService {
    constructor(playersRepo, clubsService) {
        this.playersRepo = playersRepo;
        this.clubsService = clubsService;
    }
    async getVipPoints(playerId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const totalSpent = Number(player.totalSpent) || 0;
            const vipPoints = Math.floor(totalSpent * 0.1);
            const tier = this.getVipTier(vipPoints);
            const nextTier = this.getNextTier(vipPoints);
            return {
                vipPoints,
                tier: tier.name,
                multiplier: tier.multiplier,
                nextTier: nextTier ? {
                    name: nextTier.name,
                    pointsRequired: nextTier.minPoints,
                    pointsToNext: nextTier.minPoints - vipPoints,
                } : null,
                allTiers: exports.VIP_TIERS,
            };
        }
        catch (err) {
            console.error('Get VIP points error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get VIP points');
        }
    }
    async getClubPoints(playerId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const clubPoints = Math.floor(Math.random() * 1000);
            return {
                clubPoints,
                playerId,
                clubId,
                clubName: player.club.name,
            };
        }
        catch (err) {
            console.error('Get club points error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get club points');
        }
    }
    async getAvailableRewards(clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const rewards = [
                {
                    id: 'reward-1',
                    name: 'Free Tournament Entry',
                    pointsCost: 500,
                    description: 'Enter any tournament for free',
                    available: true,
                },
                {
                    id: 'reward-2',
                    name: '₹100 Bonus',
                    pointsCost: 1000,
                    description: 'Get ₹100 added to your balance',
                    available: true,
                },
                {
                    id: 'reward-3',
                    name: 'VIP Lounge Access',
                    pointsCost: 2000,
                    description: '1-month access to VIP lounge',
                    available: true,
                },
            ];
            return {
                rewards,
                total: rewards.length,
            };
        }
        catch (err) {
            console.error('Get rewards error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get rewards');
        }
    }
    async redeemPoints(playerId, clubId, rewardId, pointsToRedeem) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const totalSpent = Number(player.totalSpent) || 0;
            const vipPoints = Math.floor(totalSpent * 0.1);
            if (vipPoints < pointsToRedeem) {
                throw new common_1.BadRequestException('Insufficient VIP points');
            }
            return {
                success: true,
                message: 'Points redeemed successfully',
                rewardId,
                pointsRedeemed: pointsToRedeem,
                remainingPoints: vipPoints - pointsToRedeem,
                redeemedAt: new Date().toISOString(),
            };
        }
        catch (err) {
            console.error('Redeem points error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to redeem points');
        }
    }
    getVipTier(points) {
        for (let i = exports.VIP_TIERS.length - 1; i >= 0; i--) {
            if (points >= exports.VIP_TIERS[i].minPoints) {
                return exports.VIP_TIERS[i];
            }
        }
        return exports.VIP_TIERS[0];
    }
    getNextTier(points) {
        for (let i = 0; i < exports.VIP_TIERS.length; i++) {
            if (points < exports.VIP_TIERS[i].minPoints) {
                return exports.VIP_TIERS[i];
            }
        }
        return null;
    }
};
exports.PlayerVipService = PlayerVipService;
exports.PlayerVipService = PlayerVipService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        clubs_service_1.ClubsService])
], PlayerVipService);
//# sourceMappingURL=player-vip.service.js.map