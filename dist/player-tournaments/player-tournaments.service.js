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
            let registrations = [];
            try {
                registrations = await this.playersRepo.query(`
          SELECT 
            tr.id,
            tr.tournament_id as "tournamentId",
            tr.status,
            tr.registered_at as "registeredAt",
            t.name as "tournamentName",
            t.start_time as "startTime"
          FROM tournament_registrations tr
          INNER JOIN tournaments t ON t.id = tr.tournament_id
          WHERE tr.player_id = $1 AND tr.club_id = $2
          ORDER BY tr.registered_at DESC
        `, [playerId, clubId]);
            }
            catch (dbErr) {
                if (dbErr.message && (dbErr.message.includes('does not exist') ||
                    dbErr.message.includes('relation "tournament_registrations"') ||
                    dbErr.code === '42P01')) {
                    console.warn('tournament_registrations table does not exist yet, returning empty registrations');
                    registrations = [];
                }
                else {
                    throw dbErr;
                }
            }
            return {
                registrations: registrations || [],
                total: (registrations === null || registrations === void 0 ? void 0 : registrations.length) || 0,
            };
        }
        catch (err) {
            console.error('Get registrations error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException(`Failed to get registrations: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
            if (!uuidRegex.test(tournamentId)) {
                throw new common_1.BadRequestException('Invalid tournament ID format');
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
            const tournament = await this.playersRepo.query(`
        SELECT id, max_players, current_players, status, start_time
        FROM tournaments
        WHERE id = $1 AND club_id = $2
      `, [tournamentId, clubId]);
            if (!tournament || tournament.length === 0) {
                throw new common_1.NotFoundException('Tournament not found');
            }
            const tourn = tournament[0];
            if (tourn.status !== 'upcoming' && tourn.status !== 'registration_open') {
                throw new common_1.BadRequestException('Tournament is not accepting registrations');
            }
            if (tourn.current_players >= tourn.max_players) {
                throw new common_1.BadRequestException('Tournament is full');
            }
            let existing = [];
            try {
                existing = await this.playersRepo.query(`
          SELECT id FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2
        `, [tournamentId, playerId]);
            }
            catch (dbErr) {
                if (dbErr.message && (dbErr.message.includes('does not exist') ||
                    dbErr.message.includes('relation "tournament_registrations"') ||
                    dbErr.code === '42P01')) {
                    console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
                    throw new common_1.BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
                }
                throw dbErr;
            }
            if (existing && existing.length > 0) {
                throw new common_1.BadRequestException('You are already registered for this tournament');
            }
            let registration;
            try {
                registration = await this.playersRepo.query(`
          INSERT INTO tournament_registrations (tournament_id, player_id, club_id, status, registered_at)
          VALUES ($1, $2, $3, 'registered', NOW())
          RETURNING id, registered_at
        `, [tournamentId, playerId, clubId]);
            }
            catch (dbErr) {
                if (dbErr.message && (dbErr.message.includes('does not exist') ||
                    dbErr.message.includes('relation "tournament_registrations"') ||
                    dbErr.code === '42P01')) {
                    console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
                    throw new common_1.BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
                }
                if (dbErr.code === '23505' || dbErr.message.includes('duplicate key')) {
                    throw new common_1.BadRequestException('You are already registered for this tournament');
                }
                throw dbErr;
            }
            await this.playersRepo.query(`
        UPDATE tournaments
        SET current_players = current_players + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [tournamentId]);
            return {
                success: true,
                message: 'Registered for tournament successfully',
                tournamentId,
                registrationId: registration[0].id,
                registeredAt: registration[0].registered_at,
            };
        }
        catch (err) {
            console.error('Register tournament error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.BadRequestException(`Failed to register for tournament: ${errorMessage}`);
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
            if (!uuidRegex.test(tournamentId)) {
                throw new common_1.BadRequestException('Invalid tournament ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            let registration = [];
            try {
                registration = await this.playersRepo.query(`
          SELECT id FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2 AND club_id = $3
        `, [tournamentId, playerId, clubId]);
            }
            catch (dbErr) {
                if (dbErr.message && (dbErr.message.includes('does not exist') ||
                    dbErr.message.includes('relation "tournament_registrations"') ||
                    dbErr.code === '42P01')) {
                    console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
                    throw new common_1.BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
                }
                throw dbErr;
            }
            if (!registration || registration.length === 0) {
                throw new common_1.NotFoundException('Registration not found');
            }
            try {
                await this.playersRepo.query(`
          DELETE FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2 AND club_id = $3
        `, [tournamentId, playerId, clubId]);
            }
            catch (dbErr) {
                if (dbErr.message && (dbErr.message.includes('does not exist') ||
                    dbErr.message.includes('relation "tournament_registrations"') ||
                    dbErr.code === '42P01')) {
                    console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
                    throw new common_1.BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
                }
                throw dbErr;
            }
            await this.playersRepo.query(`
        UPDATE tournaments
        SET current_players = GREATEST(0, current_players - 1),
            updated_at = NOW()
        WHERE id = $1
      `, [tournamentId]);
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
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.BadRequestException(`Failed to cancel registration: ${errorMessage}`);
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