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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const users_service_1 = require("../users/users.service");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const login_dto_1 = require("./dto/login.dto");
const player_login_dto_1 = require("./dto/player-login.dto");
const player_signup_dto_1 = require("./dto/player-signup.dto");
const update_player_profile_dto_1 = require("./dto/update-player-profile.dto");
const change_player_password_dto_1 = require("./dto/change-player-password.dto");
let AuthController = class AuthController {
    constructor(authService, usersService) {
        this.authService = authService;
        this.usersService = usersService;
    }
    async me(apiKey) {
        if (!apiKey) {
            throw new common_1.UnauthorizedException('API key is required');
        }
        const user = await this.authService.validateApiKey(apiKey);
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid API key');
        }
        return user;
    }
    async login(dto) {
        if (!dto.email || !dto.email.trim()) {
            throw new common_1.UnauthorizedException('Email is required');
        }
        if (!dto.password || !dto.password.trim()) {
            throw new common_1.UnauthorizedException('Password is required');
        }
        return this.authService.login(dto.email.trim(), dto.password);
    }
    async resetPassword(dto) {
        if (!dto.email || !dto.email.trim()) {
            throw new common_1.UnauthorizedException('Email is required');
        }
        if (!dto.currentPassword || !dto.currentPassword.trim()) {
            throw new common_1.UnauthorizedException('Current password is required');
        }
        if (!dto.newPassword || !dto.newPassword.trim()) {
            throw new common_1.UnauthorizedException('New password is required');
        }
        return this.usersService.resetPassword(dto.email.trim(), dto.currentPassword, dto.newPassword);
    }
    async playerLogin(dto) {
        return this.authService.playerLogin(dto.clubCode, dto.email, dto.password);
    }
    async playerSignup(dto) {
        return this.authService.playerSignup(dto.clubCode, dto.firstName, dto.lastName, dto.email, dto.password, dto.phoneNumber, dto.nickname, dto.referralCode);
    }
    async getPlayerProfile(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.authService.getPlayerProfile(playerId.trim(), clubId.trim());
    }
    async updatePlayerProfile(playerId, clubId, dto) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!dto) {
            throw new common_1.BadRequestException('Request body is required');
        }
        return this.authService.updatePlayerProfile(playerId.trim(), clubId.trim(), dto.firstName, dto.lastName, dto.phoneNumber, dto.nickname);
    }
    async changePlayerPassword(playerId, clubId, dto) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!dto) {
            throw new common_1.BadRequestException('Request body is required');
        }
        return this.authService.changePlayerPassword(playerId.trim(), clubId.trim(), dto.currentPassword, dto.newPassword);
    }
    async getPlayerBalance(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.authService.getPlayerBalance(playerId.trim(), clubId.trim());
    }
    async getPlayerTransactions(playerId, clubId, limit, offset) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        const limitNum = limit ? parseInt(limit, 10) : 50;
        const offsetNum = offset ? parseInt(offset, 10) : 0;
        return this.authService.getPlayerTransactions(playerId.trim(), clubId.trim(), limitNum, offsetNum);
    }
    async joinWaitlist(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.authService.joinWaitlist(playerId.trim(), clubId.trim(), body === null || body === void 0 ? void 0 : body.tableType, (body === null || body === void 0 ? void 0 : body.partySize) || 1);
    }
    async getWaitlistStatus(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.authService.getWaitlistStatus(playerId.trim(), clubId.trim());
    }
    async cancelWaitlist(playerId, clubId, entryId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!entryId || !entryId.trim()) {
            throw new common_1.BadRequestException('Entry ID is required');
        }
        return this.authService.cancelWaitlist(playerId.trim(), clubId.trim(), entryId.trim());
    }
    async getAvailableTables(clubId) {
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.authService.getAvailableTables(clubId.trim());
    }
    async getTableDetails(clubId, tableId) {
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!tableId || !tableId.trim()) {
            throw new common_1.BadRequestException('Table ID is required');
        }
        return this.authService.getTableDetails(clubId.trim(), tableId.trim());
    }
    async requestCredit(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!body || body.amount === undefined) {
            throw new common_1.BadRequestException('Amount is required');
        }
        return this.authService.requestCredit(playerId.trim(), clubId.trim(), body.amount, body.notes);
    }
    async getPlayerStats(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.authService.getPlayerStats(playerId.trim(), clubId.trim());
    }
    async placeFnbOrder(playerId, clubId, body) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        if (!body) {
            throw new common_1.BadRequestException('Order data is required');
        }
        return this.authService.placeFnbOrder(playerId.trim(), clubId.trim(), body);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, common_1.Headers)('x-api-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('player/login'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [player_login_dto_1.PlayerLoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "playerLogin", null);
__decorate([
    (0, common_1.Post)('player/signup'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [player_signup_dto_1.PlayerSignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "playerSignup", null);
__decorate([
    (0, common_1.Get)('player/me'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getPlayerProfile", null);
__decorate([
    (0, common_1.Put)('player/profile'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_player_profile_dto_1.UpdatePlayerProfileDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "updatePlayerProfile", null);
__decorate([
    (0, common_1.Post)('player/change-password'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, change_player_password_dto_1.ChangePlayerPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePlayerPassword", null);
__decorate([
    (0, common_1.Get)('player/balance'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getPlayerBalance", null);
__decorate([
    (0, common_1.Get)('player/transactions'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getPlayerTransactions", null);
__decorate([
    (0, common_1.Post)('player/waitlist'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "joinWaitlist", null);
__decorate([
    (0, common_1.Get)('player/waitlist'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getWaitlistStatus", null);
__decorate([
    (0, common_1.Delete)('player/waitlist/:entryId'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('entryId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "cancelWaitlist", null);
__decorate([
    (0, common_1.Get)('player/tables'),
    __param(0, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getAvailableTables", null);
__decorate([
    (0, common_1.Get)('player/tables/:tableId'),
    __param(0, (0, common_1.Headers)('x-club-id')),
    __param(1, (0, common_1.Param)('tableId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getTableDetails", null);
__decorate([
    (0, common_1.Post)('player/credit-request'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestCredit", null);
__decorate([
    (0, common_1.Get)('player/stats'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getPlayerStats", null);
__decorate([
    (0, common_1.Post)('player/fnb/order'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "placeFnbOrder", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        users_service_1.UsersService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map