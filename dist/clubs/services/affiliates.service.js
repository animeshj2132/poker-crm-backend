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
exports.AffiliatesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const affiliate_entity_1 = require("../entities/affiliate.entity");
const player_entity_1 = require("../entities/player.entity");
const user_entity_1 = require("../../users/user.entity");
const club_entity_1 = require("../club.entity");
const users_service_1 = require("../../users/users.service");
const roles_1 = require("../../common/rbac/roles");
let AffiliatesService = class AffiliatesService {
    constructor(affiliatesRepo, playersRepo, usersRepo, clubsRepo, usersService) {
        this.affiliatesRepo = affiliatesRepo;
        this.playersRepo = playersRepo;
        this.usersRepo = usersRepo;
        this.clubsRepo = clubsRepo;
        this.usersService = usersService;
    }
    generateAffiliateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        return code;
    }
    async createAffiliate(clubId, email, displayName, customCode, commissionRate = 5.0) {
        if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
            throw new common_1.BadRequestException('Club ID is required');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(clubId.trim())) {
            throw new common_1.BadRequestException('Invalid club ID format');
        }
        if (!email || typeof email !== 'string' || !email.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        if (email.trim().length > 200) {
            throw new common_1.BadRequestException('Email cannot exceed 200 characters');
        }
        if (displayName !== undefined && displayName !== null) {
            if (typeof displayName !== 'string') {
                throw new common_1.BadRequestException('Display name must be a string');
            }
            if (displayName.trim().length > 200) {
                throw new common_1.BadRequestException('Display name cannot exceed 200 characters');
            }
        }
        if (customCode !== undefined && customCode !== null) {
            if (typeof customCode !== 'string') {
                throw new common_1.BadRequestException('Custom code must be a string');
            }
            if (customCode.trim().length < 3 || customCode.trim().length > 20) {
                throw new common_1.BadRequestException('Custom code must be between 3 and 20 characters');
            }
        }
        if (typeof commissionRate !== 'number' || isNaN(commissionRate)) {
            throw new common_1.BadRequestException('Commission rate must be a valid number');
        }
        if (commissionRate < 0 || commissionRate > 100) {
            throw new common_1.BadRequestException('Commission rate must be between 0 and 100');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId.trim() } });
        if (!club) {
            throw new common_1.NotFoundException('Club not found');
        }
        let user = await this.usersService.findByEmail(email);
        if (!user) {
            const tempPassword = this.generateTempPassword();
            const saltRounds = 12;
            const bcrypt = require('bcrypt');
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
            user = this.usersRepo.create({
                email,
                displayName: displayName || null,
                passwordHash
            });
            user = await this.usersRepo.save(user);
        }
        const existingAffiliate = await this.affiliatesRepo.findOne({
            where: { club: { id: clubId }, user: { id: user.id } }
        });
        if (existingAffiliate) {
            throw new common_1.ConflictException('User is already an affiliate for this club');
        }
        let code = customCode === null || customCode === void 0 ? void 0 : customCode.toUpperCase().trim();
        if (!code) {
            code = this.generateAffiliateCode();
        }
        const existingCode = await this.affiliatesRepo.findOne({
            where: { code }
        });
        if (existingCode) {
            if (customCode) {
                throw new common_1.ConflictException('Affiliate code already exists');
            }
            code = this.generateAffiliateCode();
            const checkAgain = await this.affiliatesRepo.findOne({ where: { code } });
            if (checkAgain) {
                code = this.generateAffiliateCode();
            }
        }
        await this.usersService.assignClubRole(user.id, clubId, roles_1.ClubRole.AFFILIATE);
        const affiliate = this.affiliatesRepo.create({
            club,
            user,
            code,
            name: displayName || user.displayName || null,
            commissionRate,
            status: 'Active'
        });
        return await this.affiliatesRepo.save(affiliate);
    }
    async findByCode(code) {
        if (!code || typeof code !== 'string' || !code.trim()) {
            return null;
        }
        const trimmedCode = code.trim().toUpperCase();
        if (trimmedCode.length < 3 || trimmedCode.length > 20) {
            return null;
        }
        if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
            return null;
        }
        return await this.affiliatesRepo.findOne({
            where: { code: trimmedCode },
            relations: ['club', 'user']
        });
    }
    async findByUserAndClub(userId, clubId) {
        if (!userId || typeof userId !== 'string' || !userId.trim()) {
            throw new common_1.BadRequestException('User ID is required');
        }
        if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
            throw new common_1.BadRequestException('Club ID is required');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId.trim())) {
            throw new common_1.BadRequestException('Invalid user ID format');
        }
        if (!uuidRegex.test(clubId.trim())) {
            throw new common_1.BadRequestException('Invalid club ID format');
        }
        return await this.affiliatesRepo.findOne({
            where: { user: { id: userId.trim() }, club: { id: clubId.trim() } },
            relations: ['club', 'user', 'players']
        });
    }
    async findByClub(clubId) {
        if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
            throw new common_1.BadRequestException('Club ID is required');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(clubId.trim())) {
            throw new common_1.BadRequestException('Invalid club ID format');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId.trim() } });
        if (!club) {
            throw new common_1.NotFoundException('Club not found');
        }
        return await this.affiliatesRepo.find({
            where: { club: { id: clubId.trim() } },
            relations: ['user', 'players'],
            order: { createdAt: 'DESC' }
        });
    }
    async createPlayer(clubId, name, email, phoneNumber, playerId, affiliateCode, notes) {
        if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
            throw new common_1.BadRequestException('Club ID is required');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(clubId.trim())) {
            throw new common_1.BadRequestException('Invalid club ID format');
        }
        if (!name || typeof name !== 'string' || !name.trim()) {
            throw new common_1.BadRequestException('Name is required');
        }
        if (name.trim().length < 2 || name.trim().length > 200) {
            throw new common_1.BadRequestException('Name must be between 2 and 200 characters');
        }
        if (!email || typeof email !== 'string' || !email.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        const trimmedEmail = email.trim().toLowerCase();
        if (trimmedEmail.length > 200) {
            throw new common_1.BadRequestException('Email cannot exceed 200 characters');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        if (phoneNumber !== undefined && phoneNumber !== null) {
            if (typeof phoneNumber !== 'string') {
                throw new common_1.BadRequestException('Phone number must be a string');
            }
            if (phoneNumber.trim().length < 10 || phoneNumber.trim().length > 20) {
                throw new common_1.BadRequestException('Phone number must be between 10 and 20 characters');
            }
        }
        if (playerId !== undefined && playerId !== null) {
            if (typeof playerId !== 'string') {
                throw new common_1.BadRequestException('Player ID must be a string');
            }
            if (playerId.trim().length > 100) {
                throw new common_1.BadRequestException('Player ID cannot exceed 100 characters');
            }
        }
        if (affiliateCode !== undefined && affiliateCode !== null) {
            if (typeof affiliateCode !== 'string') {
                throw new common_1.BadRequestException('Affiliate code must be a string');
            }
            if (affiliateCode.trim().length < 3 || affiliateCode.trim().length > 20) {
                throw new common_1.BadRequestException('Affiliate code must be between 3 and 20 characters');
            }
        }
        if (notes !== undefined && notes !== null) {
            if (typeof notes !== 'string') {
                throw new common_1.BadRequestException('Notes must be a string');
            }
            if (notes.trim().length > 500) {
                throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
            }
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId.trim() } });
        if (!club) {
            throw new common_1.NotFoundException('Club not found');
        }
        const existingPlayer = await this.playersRepo.findOne({
            where: { club: { id: clubId.trim() }, email: trimmedEmail }
        });
        if (existingPlayer) {
            throw new common_1.ConflictException('Player with this email already exists for this club');
        }
        let affiliate = null;
        if (affiliateCode) {
            const trimmedCode = affiliateCode.trim().toUpperCase();
            affiliate = await this.findByCode(trimmedCode);
            if (!affiliate) {
                throw new common_1.NotFoundException('Invalid or expired affiliate code');
            }
            if (affiliate.club.id !== clubId.trim()) {
                throw new common_1.BadRequestException('Affiliate code does not belong to this club');
            }
            if (affiliate.status !== 'Active') {
                throw new common_1.BadRequestException('Affiliate is not active. Please contact support.');
            }
        }
        const player = this.playersRepo.create({
            club,
            affiliate,
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phoneNumber: (phoneNumber === null || phoneNumber === void 0 ? void 0 : phoneNumber.trim()) || null,
            playerId: (playerId === null || playerId === void 0 ? void 0 : playerId.trim()) || null,
            status: 'Active',
            notes: (notes === null || notes === void 0 ? void 0 : notes.trim()) || null
        });
        const savedPlayer = await this.playersRepo.save(player);
        if (affiliate) {
            affiliate.totalReferrals += 1;
            await this.affiliatesRepo.save(affiliate);
        }
        return savedPlayer;
    }
    async getAffiliatePlayers(affiliateId) {
        if (!affiliateId || typeof affiliateId !== 'string' || !affiliateId.trim()) {
            throw new common_1.BadRequestException('Affiliate ID is required');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(affiliateId.trim())) {
            throw new common_1.BadRequestException('Invalid affiliate ID format');
        }
        const affiliate = await this.affiliatesRepo.findOne({
            where: { id: affiliateId.trim() }
        });
        if (!affiliate) {
            throw new common_1.NotFoundException('Affiliate not found');
        }
        return await this.playersRepo.find({
            where: { affiliate: { id: affiliateId.trim() } },
            order: { createdAt: 'DESC' }
        });
    }
    async getAffiliateStats(affiliateId) {
        if (!affiliateId || typeof affiliateId !== 'string' || !affiliateId.trim()) {
            throw new common_1.BadRequestException('Affiliate ID is required');
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(affiliateId.trim())) {
            throw new common_1.BadRequestException('Invalid affiliate ID format');
        }
        const affiliate = await this.affiliatesRepo.findOne({
            where: { id: affiliateId.trim() },
            relations: ['players']
        });
        if (!affiliate) {
            throw new common_1.NotFoundException('Affiliate not found');
        }
        const players = affiliate.players || [];
        const activePlayers = players.filter(p => p.status === 'Active').length;
        const totalSpent = players.reduce((sum, p) => sum + Number(p.totalSpent || 0), 0);
        const totalCommission = players.reduce((sum, p) => sum + Number(p.totalCommission || 0), 0);
        return {
            affiliate: {
                id: affiliate.id,
                code: affiliate.code,
                name: affiliate.name,
                commissionRate: affiliate.commissionRate,
                status: affiliate.status
            },
            stats: {
                totalReferrals: affiliate.totalReferrals,
                activePlayers,
                totalPlayers: players.length,
                totalSpent,
                totalCommission,
                averageSpent: players.length > 0 ? totalSpent / players.length : 0
            },
            players: players.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email,
                totalSpent: p.totalSpent,
                totalCommission: p.totalCommission,
                status: p.status,
                createdAt: p.createdAt
            }))
        };
    }
    generateTempPassword() {
        const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lowercase = 'abcdefghijkmnpqrstuvwxyz';
        const numbers = '23456789';
        const special = '!@#$%&*';
        let password = '';
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        password += numbers[Math.floor(Math.random() * numbers.length)];
        password += special[Math.floor(Math.random() * special.length)];
        const allChars = uppercase + lowercase + numbers + special;
        for (let i = password.length; i < 12; i++) {
            password += allChars[Math.floor(Math.random() * allChars.length)];
        }
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
};
exports.AffiliatesService = AffiliatesService;
exports.AffiliatesService = AffiliatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(affiliate_entity_1.Affiliate)),
    __param(1, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        users_service_1.UsersService])
], AffiliatesService);
//# sourceMappingURL=affiliates.service.js.map