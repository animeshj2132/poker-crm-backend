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
exports.PlayerTournamentsController = void 0;
const common_1 = require("@nestjs/common");
const player_tournaments_service_1 = require("./player-tournaments.service");
let PlayerTournamentsController = class PlayerTournamentsController {
    constructor(tournamentsService) {
        this.tournamentsService = tournamentsService;
    }
    async getUpcomingTournaments(clubId, limit) {
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        const limitNum = limit ? parseInt(limit, 10) : 20;
        return this.tournamentsService.getUpcomingTournaments(clubId.trim(), limitNum);
    }
    async getMyRegistrations(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.tournamentsService.getMyRegistrations(playerId.trim(), clubId.trim());
    }
    async registerForTournament(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!(body === null || body === void 0 ? void 0 : body.tournamentId)) {
            throw new common_1.BadRequestException('tournamentId is required');
        }
        return this.tournamentsService.registerForTournament(playerId.trim(), clubId.trim(), body.tournamentId);
    }
    async cancelRegistration(tournamentId, playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.tournamentsService.cancelRegistration(tournamentId, playerId.trim(), clubId.trim());
    }
    async getTournamentDetails(tournamentId, clubId) {
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.tournamentsService.getTournamentDetails(tournamentId, clubId.trim());
    }
};
exports.PlayerTournamentsController = PlayerTournamentsController;
__decorate([
    (0, common_1.Get)('upcoming'),
    __param(0, (0, common_1.Headers)('x-club-id')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerTournamentsController.prototype, "getUpcomingTournaments", null);
__decorate([
    (0, common_1.Get)('my-registrations'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerTournamentsController.prototype, "getMyRegistrations", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PlayerTournamentsController.prototype, "registerForTournament", null);
__decorate([
    (0, common_1.Delete)('register/:tournamentId'),
    __param(0, (0, common_1.Param)('tournamentId')),
    __param(1, (0, common_1.Headers)('x-player-id')),
    __param(2, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PlayerTournamentsController.prototype, "cancelRegistration", null);
__decorate([
    (0, common_1.Get)(':tournamentId'),
    __param(0, (0, common_1.Param)('tournamentId')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerTournamentsController.prototype, "getTournamentDetails", null);
exports.PlayerTournamentsController = PlayerTournamentsController = __decorate([
    (0, common_1.Controller)('player-tournaments'),
    __metadata("design:paramtypes", [player_tournaments_service_1.PlayerTournamentsService])
], PlayerTournamentsController);
//# sourceMappingURL=player-tournaments.controller.js.map