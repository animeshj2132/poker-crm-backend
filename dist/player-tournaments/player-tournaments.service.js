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
exports.PlayerTournamentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_service_1 = require("../clubs/clubs.service");
let PlayerTournamentsService = class PlayerTournamentsService {
    constructor(playersRepo, clubsService) {
        this.playersRepo = playersRepo;
        this.clubsService = clubsService;
    }
    async getUpcomingTournaments(clubId, limit = 20) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const tournamentsData = await this.playersRepo.query(`
        SELECT 
          id, 
          name, 
          description,
          buy_in, 
          prize_pool, 
          max_players, 
          current_players as "registeredPlayers",
          start_time as "startDate", 
          status,
          structure
        FROM tournaments 
        WHERE club_id = $1 
          AND status IN ('upcoming', 'registration_open')
          AND start_time > NOW()
        ORDER BY start_time ASC
        LIMIT $2
      `, [clubId, limit]);
            const tournaments = tournamentsData.map((t) => ({
                id: t.id,
                name: t.name,
                description: t.description,
                startDate: t.startDate,
                buyIn: parseFloat(t.buy_in),
                prizePool: parseFloat(t.prize_pool),
                maxPlayers: t.max_players,
                registeredPlayers: t.registeredPlayers || 0,
                status: t.status,
                structure: t.structure,
            }));
            return {
                tournaments,
                total: tournaments.length,
            };
        }
        catch (err) {
            console.error('Get tournaments error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get tournaments');
        }
    }
    async getMyRegistrations(playerId, clubId) {
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
                registrations: [],
                total: 0,
            };
        }
        catch (err) {
            console.error('Get registrations error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get registrations');
        }
    }
    async registerForTournament(playerId, clubId, tournamentId) {
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
                throw new common_1.ForbiddenException('Please complete KYC verification before registering for tournaments');
            }
            return {
                success: true,
                message: 'Registered for tournament successfully',
                tournamentId,
                registeredAt: new Date().toISOString(),
            };
        }
        catch (err) {
            console.error('Register tournament error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to register for tournament');
        }
    }
    async cancelRegistration(tournamentId, playerId, clubId) {
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
                message: 'Registration cancelled successfully',
                tournamentId,
            };
        }
        catch (err) {
            console.error('Cancel registration error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to cancel registration');
        }
    }
    async getTournamentDetails(tournamentId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            return {
                tournament: {
                    id: tournamentId,
                    name: 'Sample Tournament',
                    startDate: new Date(Date.now() + 86400000).toISOString(),
                    buyIn: 500,
                    prizePool: 10000,
                    maxPlayers: 50,
                    registeredPlayers: 23,
                    status: 'upcoming',
                    structure: 'Freeze-out',
                    blinds: '25/50',
                },
            };
        }
        catch (err) {
            console.error('Get tournament details error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get tournament details');
        }
    }
};
exports.PlayerTournamentsService = PlayerTournamentsService;
exports.PlayerTournamentsService = PlayerTournamentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        clubs_service_1.ClubsService])
], PlayerTournamentsService);
//# sourceMappingURL=player-tournaments.service.js.map