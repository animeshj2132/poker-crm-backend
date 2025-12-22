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
exports.PlayerPlaytimeService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_service_1 = require("../clubs/clubs.service");
let PlayerPlaytimeService = class PlayerPlaytimeService {
    constructor(playersRepo, clubsService) {
        this.playersRepo = playersRepo;
        this.clubsService = clubsService;
    }
    async getCurrentSession(playerId, clubId) {
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
            return {
                session: null,
                hasActiveSession: false,
            };
        }
        catch (err) {
            console.error('Get current session error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get current session');
        }
    }
    async getSessionHistory(playerId, clubId, limit = 20, offset = 0) {
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
            return {
                sessions: [],
                total: 0,
                limit,
                offset,
            };
        }
        catch (err) {
            console.error('Get session history error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get session history');
        }
    }
    async startCallTime(playerId, clubId, tableId) {
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
            return {
                success: true,
                message: 'Call time started',
                startedAt: new Date().toISOString(),
                tableId: tableId || null,
            };
        }
        catch (err) {
            console.error('Start call time error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to start call time');
        }
    }
    async requestCashOut(playerId, clubId, amount) {
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
            const kycStatus = player.kycStatus || 'pending';
            if (kycStatus !== 'approved' && kycStatus !== 'verified') {
                throw new common_1.ForbiddenException('Please complete KYC verification before requesting cash out');
            }
            return {
                success: true,
                message: 'Cash out request submitted',
                amount: amount || 0,
                requestedAt: new Date().toISOString(),
                status: 'pending',
            };
        }
        catch (err) {
            console.error('Request cash out error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to request cash out');
        }
    }
};
exports.PlayerPlaytimeService = PlayerPlaytimeService;
exports.PlayerPlaytimeService = PlayerPlaytimeService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        clubs_service_1.ClubsService])
], PlayerPlaytimeService);
//# sourceMappingURL=player-playtime.service.js.map