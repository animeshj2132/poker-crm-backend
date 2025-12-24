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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const roles_1 = require("../common/rbac/roles");
const users_service_1 = require("../users/users.service");
const clubs_service_1 = require("../clubs/clubs.service");
const fnb_service_1 = require("../clubs/services/fnb.service");
const user_tenant_role_entity_1 = require("../users/user-tenant-role.entity");
const user_club_role_entity_1 = require("../users/user-club-role.entity");
const player_entity_1 = require("../clubs/entities/player.entity");
const financial_transaction_entity_1 = require("../clubs/entities/financial-transaction.entity");
const waitlist_entry_entity_1 = require("../clubs/entities/waitlist-entry.entity");
const table_entity_1 = require("../clubs/entities/table.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const roles_2 = require("../common/rbac/roles");
const bcrypt = require("bcrypt");
const affiliates_service_1 = require("../clubs/services/affiliates.service");
const financial_transactions_service_1 = require("../clubs/services/financial-transactions.service");
const waitlist_seating_service_1 = require("../clubs/services/waitlist-seating.service");
const credit_requests_service_1 = require("../clubs/services/credit-requests.service");
let AuthService = class AuthService {
    constructor(usersService, clubsService, fnbService, affiliatesService, financialTransactionsService, waitlistSeatingService, creditRequestsService, userTenantRoleRepo, userClubRoleRepo, playersRepo, transactionsRepo, waitlistRepo, tablesRepo) {
        this.usersService = usersService;
        this.clubsService = clubsService;
        this.fnbService = fnbService;
        this.affiliatesService = affiliatesService;
        this.financialTransactionsService = financialTransactionsService;
        this.waitlistSeatingService = waitlistSeatingService;
        this.creditRequestsService = creditRequestsService;
        this.userTenantRoleRepo = userTenantRoleRepo;
        this.userClubRoleRepo = userClubRoleRepo;
        this.playersRepo = playersRepo;
        this.transactionsRepo = transactionsRepo;
        this.waitlistRepo = waitlistRepo;
        this.tablesRepo = tablesRepo;
    }
    async validateApiKey(apiKey) {
        if (apiKey === process.env.MASTER_API_KEY) {
            return {
                id: 'master-user',
                globalRoles: [roles_1.GlobalRole.MASTER_ADMIN],
                tenantRoles: [],
                clubRoles: []
            };
        }
        return undefined;
    }
    async login(email, password) {
        try {
            if (!email || !email.trim()) {
                throw new common_1.UnauthorizedException('Email is required');
            }
            if (!password || !password.trim()) {
                throw new common_1.UnauthorizedException('Password is required');
            }
            const isValid = await this.usersService.verifyPassword(email.trim(), password);
            if (!isValid) {
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            const user = await this.usersService.findByEmail(email.trim());
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            let tenantRoles = [];
            try {
                tenantRoles = await this.userTenantRoleRepo.find({
                    where: { user: { id: user.id }, role: roles_2.TenantRole.SUPER_ADMIN },
                    relations: ['tenant']
                });
            }
            catch (err) {
                console.error('Error fetching tenant roles:', err);
                tenantRoles = [];
            }
            let clubRoles = [];
            try {
                clubRoles = await this.userClubRoleRepo.find({
                    where: { user: { id: user.id } },
                    relations: ['club', 'club.tenant']
                });
            }
            catch (err) {
                console.error('Error fetching club roles:', err);
                clubRoles = [];
            }
            return {
                user: {
                    id: user.id,
                    email: user.email,
                    displayName: user.displayName,
                    isMasterAdmin: user.isMasterAdmin || false
                },
                mustResetPassword: user.mustResetPassword || false,
                tenants: tenantRoles.map(tr => {
                    var _a, _b;
                    return ({
                        tenantId: ((_a = tr.tenant) === null || _a === void 0 ? void 0 : _a.id) || '',
                        tenantName: ((_b = tr.tenant) === null || _b === void 0 ? void 0 : _b.name) || ''
                    });
                }),
                clubs: clubRoles.map(cr => {
                    var _a, _b, _c, _d, _e, _f;
                    return ({
                        clubId: ((_a = cr.club) === null || _a === void 0 ? void 0 : _a.id) || '',
                        clubName: ((_b = cr.club) === null || _b === void 0 ? void 0 : _b.name) || '',
                        tenantId: ((_d = (_c = cr.club) === null || _c === void 0 ? void 0 : _c.tenant) === null || _d === void 0 ? void 0 : _d.id) || '',
                        tenantName: ((_f = (_e = cr.club) === null || _e === void 0 ? void 0 : _e.tenant) === null || _f === void 0 ? void 0 : _f.name) || '',
                        roles: [cr.role]
                    });
                })
            };
        }
        catch (err) {
            console.error('Login error:', err);
            if (err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.UnauthorizedException('Login failed: ' + errorMessage);
        }
    }
    async playerLogin(clubCode, email, password) {
        try {
            if (!clubCode || typeof clubCode !== 'string') {
                throw new common_1.BadRequestException('Club code is required and must be a string');
            }
            const trimmedClubCode = clubCode.trim();
            if (!trimmedClubCode) {
                throw new common_1.BadRequestException('Club code cannot be empty');
            }
            if (trimmedClubCode.length !== 6) {
                throw new common_1.BadRequestException('Club code must be exactly 6 digits');
            }
            if (!/^\d{6}$/.test(trimmedClubCode)) {
                throw new common_1.BadRequestException('Club code must contain only digits');
            }
            if (trimmedClubCode.length > 10 || trimmedClubCode.includes(';') || trimmedClubCode.includes('--')) {
                throw new common_1.BadRequestException('Invalid club code format');
            }
            if (!email || typeof email !== 'string') {
                throw new common_1.BadRequestException('Email is required and must be a string');
            }
            const trimmedEmail = email.trim();
            if (!trimmedEmail) {
                throw new common_1.BadRequestException('Email cannot be empty');
            }
            if (trimmedEmail.length > 200) {
                throw new common_1.BadRequestException('Email is too long (maximum 200 characters)');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            const emailParts = trimmedEmail.split('@');
            if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
                throw new common_1.BadRequestException('Invalid email domain');
            }
            if (trimmedEmail.includes(';') || trimmedEmail.includes('--') || trimmedEmail.includes('/*')) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            const lowerEmail = trimmedEmail.toLowerCase();
            if (!password || typeof password !== 'string') {
                throw new common_1.BadRequestException('Password is required and must be a string');
            }
            const trimmedPassword = password.trim();
            if (!trimmedPassword) {
                throw new common_1.BadRequestException('Password cannot be empty');
            }
            if (trimmedPassword.length < 1) {
                throw new common_1.BadRequestException('Password is required');
            }
            if (trimmedPassword.length > 100) {
                throw new common_1.BadRequestException('Password is too long (maximum 100 characters)');
            }
            let club;
            try {
                club = await this.clubsService.findByCode(trimmedClubCode);
            }
            catch (dbError) {
                console.error('Database error finding club:', dbError);
                throw new common_1.NotFoundException('Unable to verify club code. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Invalid club code');
            }
            if (!club.code || typeof club.code !== 'string') {
                throw new common_1.NotFoundException('Club code not configured');
            }
            if (club.code !== trimmedClubCode) {
                throw new common_1.NotFoundException('Invalid club code');
            }
            if (!club.tenant) {
                throw new common_1.NotFoundException('Club configuration error');
            }
            if (!club.tenant.id) {
                throw new common_1.NotFoundException('Club configuration error');
            }
            if (!club.id) {
                throw new common_1.NotFoundException('Club configuration error');
            }
            let player;
            try {
                player = await this.playersRepo.findOne({
                    where: {
                        club: { id: club.id },
                        email: lowerEmail
                    },
                    relations: ['club', 'club.tenant', 'affiliate']
                });
            }
            catch (dbError) {
                console.error('Database error finding player:', dbError);
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!player) {
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!player.club || !player.club.id) {
                throw new common_1.UnauthorizedException('Player account error. Please contact support.');
            }
            if (player.club.id !== club.id) {
                console.error(`SECURITY ALERT: Player ${player.id} attempted cross-club login. Club code: ${trimmedClubCode}, Player's club: ${player.club.id}`);
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!player.passwordHash) {
                throw new common_1.UnauthorizedException('Account not set up. Please sign up first.');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.UnauthorizedException('Account is suspended. Please contact support.');
            }
            if (player.status && player.status.toLowerCase() === 'inactive') {
                throw new common_1.UnauthorizedException('Account is inactive. Please contact support.');
            }
            let isValid = false;
            try {
                isValid = await bcrypt.compare(trimmedPassword, player.passwordHash);
            }
            catch (bcryptError) {
                console.error('Password comparison error:', bcryptError);
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!isValid) {
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!player.club) {
                throw new common_1.UnauthorizedException('Player account error. Please contact support.');
            }
            if (!player.club.id) {
                throw new common_1.UnauthorizedException('Player account error. Please contact support.');
            }
            if (player.club.id !== club.id) {
                console.error(`SECURITY ALERT: Player ${player.id} club mismatch after password verification. Expected club: ${club.id}, Player's club: ${player.club.id}`);
                throw new common_1.UnauthorizedException('Invalid email or password');
            }
            if (!player.club.tenant) {
                throw new common_1.UnauthorizedException('Club configuration error. Please contact support.');
            }
            if (!player.club.tenant.id) {
                throw new common_1.UnauthorizedException('Club configuration error. Please contact support.');
            }
            if (!player.id) {
                throw new common_1.UnauthorizedException('Player account error. Please contact support.');
            }
            if (!player.email || typeof player.email !== 'string') {
                throw new common_1.UnauthorizedException('Player account error. Please contact support.');
            }
            if (!player.name || typeof player.name !== 'string') {
                throw new common_1.UnauthorizedException('Player account error. Please contact support.');
            }
            if (!club.name || typeof club.name !== 'string') {
                throw new common_1.UnauthorizedException('Club configuration error. Please contact support.');
            }
            return {
                player: {
                    id: player.id,
                    name: player.name.trim(),
                    email: player.email.trim().toLowerCase(),
                    phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : null,
                    nickname: player.playerId ? player.playerId.trim() : null,
                    status: player.status || 'Active',
                    kycStatus: player.kycStatus || 'pending',
                    kycApproved: player.kycStatus === 'approved' || player.kycStatus === 'verified'
                },
                club: {
                    id: club.id,
                    name: club.name.trim(),
                    code: club.code.trim(),
                    tenantId: club.tenant.id,
                    tenantName: (club.tenant.name || '').trim()
                },
                affiliate: player.affiliate && player.affiliate.id ? {
                    id: player.affiliate.id,
                    code: player.affiliate.code ? String(player.affiliate.code).trim() : null
                } : null
            };
        }
        catch (err) {
            console.error('Player login error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.UnauthorizedException('Login failed: ' + errorMessage);
        }
    }
    async playerSignup(clubCode, firstName, lastName, email, password, phoneNumber, nickname, referralCode) {
        var _a, _b, _c;
        try {
            if (clubCode === null || clubCode === undefined) {
                throw new common_1.BadRequestException('Club code is required');
            }
            if (typeof clubCode !== 'string') {
                throw new common_1.BadRequestException('Club code must be a string');
            }
            const trimmedClubCode = clubCode.trim();
            if (!trimmedClubCode) {
                throw new common_1.BadRequestException('Club code cannot be empty');
            }
            if (trimmedClubCode.length !== 6) {
                throw new common_1.BadRequestException('Club code must be exactly 6 digits');
            }
            if (!/^\d{6}$/.test(trimmedClubCode)) {
                throw new common_1.BadRequestException('Club code must contain only digits (0-9)');
            }
            if (trimmedClubCode.includes(';') || trimmedClubCode.includes('--') || trimmedClubCode.includes('/*')) {
                throw new common_1.BadRequestException('Invalid club code format');
            }
            if (firstName === null || firstName === undefined) {
                throw new common_1.BadRequestException('First name is required');
            }
            if (typeof firstName !== 'string') {
                throw new common_1.BadRequestException('First name must be a string');
            }
            const trimmedFirstName = firstName.trim();
            if (!trimmedFirstName) {
                throw new common_1.BadRequestException('First name cannot be empty');
            }
            if (trimmedFirstName.length < 2) {
                throw new common_1.BadRequestException('First name must be at least 2 characters');
            }
            if (trimmedFirstName.length > 100) {
                throw new common_1.BadRequestException('First name cannot exceed 100 characters');
            }
            if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedFirstName)) {
                throw new common_1.BadRequestException('First name can only contain letters, spaces, hyphens, apostrophes, and periods');
            }
            if (trimmedFirstName.includes(';') || trimmedFirstName.includes('--') || trimmedFirstName.includes('/*')) {
                throw new common_1.BadRequestException('First name contains invalid characters');
            }
            if (lastName === null || lastName === undefined) {
                throw new common_1.BadRequestException('Last name is required');
            }
            if (typeof lastName !== 'string') {
                throw new common_1.BadRequestException('Last name must be a string');
            }
            const trimmedLastName = lastName.trim();
            if (!trimmedLastName) {
                throw new common_1.BadRequestException('Last name cannot be empty');
            }
            if (trimmedLastName.length < 2) {
                throw new common_1.BadRequestException('Last name must be at least 2 characters');
            }
            if (trimmedLastName.length > 100) {
                throw new common_1.BadRequestException('Last name cannot exceed 100 characters');
            }
            if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedLastName)) {
                throw new common_1.BadRequestException('Last name can only contain letters, spaces, hyphens, apostrophes, and periods');
            }
            if (trimmedLastName.includes(';') || trimmedLastName.includes('--') || trimmedLastName.includes('/*')) {
                throw new common_1.BadRequestException('Last name contains invalid characters');
            }
            const fullName = `${trimmedFirstName} ${trimmedLastName}`;
            if (fullName.length > 200) {
                throw new common_1.BadRequestException('Full name (first + last) cannot exceed 200 characters');
            }
            if (email === null || email === undefined) {
                throw new common_1.BadRequestException('Email is required');
            }
            if (typeof email !== 'string') {
                throw new common_1.BadRequestException('Email must be a string');
            }
            const trimmedEmail = email.trim();
            if (!trimmedEmail) {
                throw new common_1.BadRequestException('Email cannot be empty');
            }
            if (trimmedEmail.length > 200) {
                throw new common_1.BadRequestException('Email is too long (maximum 200 characters)');
            }
            if (trimmedEmail.length < 5) {
                throw new common_1.BadRequestException('Email is too short (minimum 5 characters)');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            const emailParts = trimmedEmail.split('@');
            if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
                throw new common_1.BadRequestException('Invalid email domain');
            }
            if ((trimmedEmail.match(/@/g) || []).length !== 1) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            if (trimmedEmail.includes(';') || trimmedEmail.includes('--') || trimmedEmail.includes('/*')) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            const lowerEmail = trimmedEmail.toLowerCase();
            if (password === null || password === undefined) {
                throw new common_1.BadRequestException('Password is required');
            }
            if (typeof password !== 'string') {
                throw new common_1.BadRequestException('Password must be a string');
            }
            const trimmedPassword = password.trim();
            if (!trimmedPassword) {
                throw new common_1.BadRequestException('Password cannot be empty');
            }
            if (trimmedPassword.length < 8) {
                throw new common_1.BadRequestException('Password must be at least 8 characters');
            }
            if (trimmedPassword.length > 100) {
                throw new common_1.BadRequestException('Password is too long (maximum 100 characters)');
            }
            const commonPasswords = ['password', '12345678', 'password123', 'qwerty123', 'admin123'];
            if (commonPasswords.includes(trimmedPassword.toLowerCase())) {
                throw new common_1.BadRequestException('Password is too common. Please choose a stronger password.');
            }
            let trimmedPhone = null;
            if (phoneNumber !== null && phoneNumber !== undefined) {
                if (typeof phoneNumber !== 'string') {
                    throw new common_1.BadRequestException('Phone number must be a string');
                }
                trimmedPhone = phoneNumber.trim();
                if (trimmedPhone) {
                    if (trimmedPhone.length < 10) {
                        throw new common_1.BadRequestException('Phone number must be at least 10 characters');
                    }
                    if (trimmedPhone.length > 20) {
                        throw new common_1.BadRequestException('Phone number cannot exceed 20 characters');
                    }
                    if (!/^[\+]?[0-9\s\-\(\)]+$/.test(trimmedPhone)) {
                        throw new common_1.BadRequestException('Phone number contains invalid characters');
                    }
                }
            }
            let trimmedNickname = null;
            if (nickname !== null && nickname !== undefined) {
                if (typeof nickname !== 'string') {
                    throw new common_1.BadRequestException('Nickname must be a string');
                }
                trimmedNickname = nickname.trim();
                if (trimmedNickname) {
                    if (trimmedNickname.length > 50) {
                        throw new common_1.BadRequestException('Nickname cannot exceed 50 characters');
                    }
                    if (trimmedNickname.includes(';') || trimmedNickname.includes('--') || trimmedNickname.includes('/*')) {
                        throw new common_1.BadRequestException('Nickname contains invalid characters');
                    }
                }
            }
            let trimmedRefCode = null;
            if (referralCode !== null && referralCode !== undefined) {
                if (typeof referralCode !== 'string') {
                    throw new common_1.BadRequestException('Referral code must be a string');
                }
                trimmedRefCode = referralCode.trim();
                if (trimmedRefCode) {
                    if (trimmedRefCode.length < 3) {
                        throw new common_1.BadRequestException('Referral code must be at least 3 characters');
                    }
                    if (trimmedRefCode.length > 20) {
                        throw new common_1.BadRequestException('Referral code cannot exceed 20 characters');
                    }
                    if (!/^[A-Z0-9]+$/.test(trimmedRefCode)) {
                        throw new common_1.BadRequestException('Referral code can only contain uppercase letters and numbers');
                    }
                }
            }
            let club;
            try {
                club = await this.clubsService.findByCode(trimmedClubCode);
            }
            catch (dbError) {
                console.error('Database error finding club:', dbError);
                throw new common_1.NotFoundException('Unable to verify club code. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Invalid club code');
            }
            if (!club.code || typeof club.code !== 'string') {
                throw new common_1.NotFoundException('Club code not configured');
            }
            if (club.code !== trimmedClubCode) {
                throw new common_1.NotFoundException('Invalid club code');
            }
            if (!club.tenant || !club.tenant.id) {
                throw new common_1.NotFoundException('Club configuration error');
            }
            if (!club.id) {
                throw new common_1.NotFoundException('Club configuration error');
            }
            let existingPlayer;
            try {
                existingPlayer = await this.playersRepo.findOne({
                    where: {
                        club: { id: club.id },
                        email: lowerEmail
                    }
                });
            }
            catch (dbError) {
                console.error('Database error checking existing player:', dbError);
                throw new common_1.BadRequestException('Unable to verify account. Please try again.');
            }
            if (existingPlayer) {
                throw new common_1.ConflictException('A player with this email already exists in this club. Please login instead.');
            }
            let affiliate = null;
            if (trimmedRefCode) {
                try {
                    const foundAffiliate = await this.affiliatesService.findByCode(trimmedRefCode);
                    if (foundAffiliate) {
                        if (((_a = foundAffiliate.club) === null || _a === void 0 ? void 0 : _a.id) === club.id) {
                            affiliate = foundAffiliate;
                        }
                        else {
                            console.warn(`Referral code ${trimmedRefCode} belongs to different club`);
                        }
                    }
                }
                catch (err) {
                    console.warn('Referral code not found or error:', trimmedRefCode, err);
                }
            }
            let passwordHash;
            try {
                const saltRounds = 12;
                passwordHash = await bcrypt.hash(trimmedPassword, saltRounds);
            }
            catch (bcryptError) {
                console.error('Password hashing error:', bcryptError);
                throw new common_1.BadRequestException('Unable to create account. Please try again.');
            }
            const player = this.playersRepo.create({
                club: club,
                name: fullName,
                email: lowerEmail,
                phoneNumber: trimmedPhone,
                playerId: trimmedNickname,
                passwordHash: passwordHash,
                affiliate: affiliate,
                status: 'Active'
            });
            let savedPlayer;
            try {
                savedPlayer = await this.playersRepo.save(player);
            }
            catch (saveError) {
                console.error('Error saving player:', saveError);
                if (saveError.code === '23505' || ((_b = saveError.message) === null || _b === void 0 ? void 0 : _b.includes('unique')) || ((_c = saveError.message) === null || _c === void 0 ? void 0 : _c.includes('duplicate'))) {
                    throw new common_1.ConflictException('A player with this email already exists in this club. Please login instead.');
                }
                throw new common_1.BadRequestException('Unable to create account. Please try again.');
            }
            if (!savedPlayer || !savedPlayer.id) {
                throw new common_1.BadRequestException('Account creation failed. Please try again.');
            }
            let playerWithRelations;
            try {
                playerWithRelations = await this.playersRepo.findOne({
                    where: { id: savedPlayer.id },
                    relations: ['club', 'club.tenant', 'affiliate']
                });
            }
            catch (dbError) {
                console.error('Database error reloading player:', dbError);
                throw new common_1.BadRequestException('Account created but unable to retrieve details. Please try logging in.');
            }
            if (!playerWithRelations) {
                throw new common_1.BadRequestException('Account created but unable to retrieve details. Please try logging in.');
            }
            if (!playerWithRelations.club || !playerWithRelations.club.id) {
                throw new common_1.BadRequestException('Account created but club information is missing.');
            }
            if (!playerWithRelations.club.tenant || !playerWithRelations.club.tenant.id) {
                throw new common_1.BadRequestException('Account created but tenant information is missing.');
            }
            return {
                player: {
                    id: playerWithRelations.id,
                    name: playerWithRelations.name ? playerWithRelations.name.trim() : fullName,
                    email: playerWithRelations.email ? playerWithRelations.email.trim().toLowerCase() : lowerEmail,
                    phoneNumber: playerWithRelations.phoneNumber ? playerWithRelations.phoneNumber.trim() : trimmedPhone,
                    nickname: playerWithRelations.playerId ? playerWithRelations.playerId.trim() : trimmedNickname,
                    status: playerWithRelations.status || 'Active',
                    kycStatus: playerWithRelations.kycStatus || 'pending',
                    kycRequired: true
                },
                club: {
                    id: club.id,
                    name: club.name ? club.name.trim() : '',
                    code: club.code ? club.code.trim() : trimmedClubCode,
                    tenantId: club.tenant.id,
                    tenantName: (club.tenant.name || '').trim()
                },
                affiliate: playerWithRelations.affiliate && playerWithRelations.affiliate.id ? {
                    id: playerWithRelations.affiliate.id,
                    code: playerWithRelations.affiliate.code ? String(playerWithRelations.affiliate.code).trim() : null
                } : null
            };
        }
        catch (err) {
            console.error('Player signup error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ConflictException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.BadRequestException('Signup failed: ' + errorMessage);
        }
    }
    async getPlayerProfile(playerId, clubId) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club', 'club.tenant', 'affiliate']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Please contact support.');
            }
            if (!player.id || !player.email || !player.name) {
                throw new common_1.BadRequestException('Player data is incomplete. Please contact support.');
            }
            if (!player.club.id || !player.club.name) {
                throw new common_1.BadRequestException('Club data is incomplete. Please contact support.');
            }
            return {
                player: {
                    id: player.id,
                    name: player.name.trim(),
                    email: player.email.trim().toLowerCase(),
                    phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : null,
                    nickname: player.playerId ? player.playerId.trim() : null,
                    status: player.status || 'Active',
                    kycStatus: player.kycStatus || 'pending',
                    kycApproved: player.kycStatus === 'approved' || player.kycStatus === 'verified',
                    kycDocuments: player.kycDocuments || null,
                    totalSpent: Number(player.totalSpent) || 0,
                    totalCommission: Number(player.totalCommission) || 0,
                    createdAt: player.createdAt,
                    updatedAt: player.updatedAt
                },
                club: {
                    id: player.club.id,
                    name: player.club.name.trim(),
                    code: player.club.code ? player.club.code.trim() : null
                },
                affiliate: player.affiliate && player.affiliate.id ? {
                    id: player.affiliate.id,
                    code: player.affiliate.code ? String(player.affiliate.code).trim() : null
                } : null
            };
        }
        catch (err) {
            console.error('Get player profile error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get player profile');
        }
    }
    async submitPanCard(playerId, clubId, panCard) {
        try {
            if (!playerId || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            if (!panCard || !panCard.trim()) {
                throw new common_1.BadRequestException('PAN card number is required');
            }
            const trimmedPlayerId = playerId.trim();
            const trimmedClubId = clubId.trim();
            const trimmedPanCard = panCard.trim().toUpperCase();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(trimmedPlayerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(trimmedClubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
            if (!panRegex.test(trimmedPanCard)) {
                throw new common_1.BadRequestException('Invalid PAN card format. Expected: ABCDE1234F');
            }
            const club = await this.clubsService.findById(trimmedClubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: trimmedPlayerId, club: { id: trimmedClubId } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const existingPlayer = await this.playersRepo.findOne({
                where: {
                    club: { id: trimmedClubId },
                    panCard: trimmedPanCard
                }
            });
            if (existingPlayer && existingPlayer.id !== trimmedPlayerId) {
                throw new common_1.ConflictException('This PAN card is already registered with another player in your club');
            }
            player.panCard = trimmedPanCard;
            await this.playersRepo.save(player);
            return {
                success: true,
                message: 'PAN card submitted successfully',
                panCard: trimmedPanCard
            };
        }
        catch (err) {
            console.error('Submit PAN card error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ConflictException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to submit PAN card');
        }
    }
    async updatePlayerProfile(playerId, clubId, firstName, lastName, phoneNumber, nickname) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (player.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot update profile.');
            }
            if (firstName || lastName) {
                const currentName = player.name.split(' ');
                const newFirstName = (firstName === null || firstName === void 0 ? void 0 : firstName.trim()) || currentName[0] || '';
                const newLastName = (lastName === null || lastName === void 0 ? void 0 : lastName.trim()) || currentName.slice(1).join(' ') || '';
                if (newFirstName.length < 2) {
                    throw new common_1.BadRequestException('First name must be at least 2 characters');
                }
                if (newFirstName.length > 100) {
                    throw new common_1.BadRequestException('First name cannot exceed 100 characters');
                }
                if (newLastName.length < 2) {
                    throw new common_1.BadRequestException('Last name must be at least 2 characters');
                }
                if (newLastName.length > 100) {
                    throw new common_1.BadRequestException('Last name cannot exceed 100 characters');
                }
                if (!/^[a-zA-Z\s\-'\.]+$/.test(newFirstName)) {
                    throw new common_1.BadRequestException('First name contains invalid characters');
                }
                if (!/^[a-zA-Z\s\-'\.]+$/.test(newLastName)) {
                    throw new common_1.BadRequestException('Last name contains invalid characters');
                }
                player.name = `${newFirstName} ${newLastName}`.trim();
            }
            if (phoneNumber !== undefined) {
                if (phoneNumber === null || phoneNumber === '') {
                    player.phoneNumber = null;
                }
                else {
                    if (typeof phoneNumber !== 'string') {
                        throw new common_1.BadRequestException('Phone number must be a string');
                    }
                    const trimmedPhone = phoneNumber.trim();
                    if (trimmedPhone.length < 10) {
                        throw new common_1.BadRequestException('Phone number must be at least 10 characters');
                    }
                    if (trimmedPhone.length > 20) {
                        throw new common_1.BadRequestException('Phone number cannot exceed 20 characters');
                    }
                    if (!/^[\+]?[0-9\s\-\(\)]+$/.test(trimmedPhone)) {
                        throw new common_1.BadRequestException('Phone number contains invalid characters');
                    }
                    player.phoneNumber = trimmedPhone;
                }
            }
            if (nickname !== undefined) {
                if (nickname === null || nickname === '') {
                    player.playerId = null;
                }
                else {
                    if (typeof nickname !== 'string') {
                        throw new common_1.BadRequestException('Nickname must be a string');
                    }
                    const trimmedNickname = nickname.trim();
                    if (trimmedNickname.length > 50) {
                        throw new common_1.BadRequestException('Nickname cannot exceed 50 characters');
                    }
                    player.playerId = trimmedNickname;
                }
            }
            const savedPlayer = await this.playersRepo.save(player);
            return {
                player: {
                    id: savedPlayer.id,
                    name: savedPlayer.name,
                    email: savedPlayer.email,
                    phoneNumber: savedPlayer.phoneNumber,
                    nickname: savedPlayer.playerId,
                    status: savedPlayer.status
                }
            };
        }
        catch (err) {
            console.error('Update player profile error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to update player profile');
        }
    }
    async changePlayerPassword(playerId, clubId, currentPassword, newPassword) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            if (!currentPassword || typeof currentPassword !== 'string' || !currentPassword.trim()) {
                throw new common_1.BadRequestException('Current password is required');
            }
            if (!newPassword || typeof newPassword !== 'string' || !newPassword.trim()) {
                throw new common_1.BadRequestException('New password is required');
            }
            if (newPassword.trim().length < 8) {
                throw new common_1.BadRequestException('New password must be at least 8 characters');
            }
            if (newPassword.trim().length > 100) {
                throw new common_1.BadRequestException('New password cannot exceed 100 characters');
            }
            if (currentPassword.trim() === newPassword.trim()) {
                throw new common_1.BadRequestException('New password must be different from current password');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (player.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (!player.passwordHash) {
                throw new common_1.BadRequestException('Password not set. Please contact support.');
            }
            const isValid = await bcrypt.compare(currentPassword.trim(), player.passwordHash);
            if (!isValid) {
                throw new common_1.UnauthorizedException('Current password is incorrect');
            }
            const saltRounds = 12;
            player.passwordHash = await bcrypt.hash(newPassword.trim(), saltRounds);
            await this.playersRepo.save(player);
            return { success: true, message: 'Password changed successfully' };
        }
        catch (err) {
            console.error('Change player password error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.UnauthorizedException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to change password');
        }
    }
    async getPlayerBalance(playerId, clubId) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const kycStatus = player.kycStatus || 'pending';
            if (kycStatus !== 'approved' && kycStatus !== 'verified') {
                return {
                    availableBalance: 0,
                    tableBalance: 0,
                    totalBalance: 0,
                    tableId: null,
                    seatNumber: null,
                    kycStatus: kycStatus,
                    kycRequired: true,
                    message: 'Please complete KYC verification to view your balance'
                };
            }
            let transactions = [];
            try {
                transactions = await this.transactionsRepo.find({
                    where: {
                        club: { id: clubId.trim() },
                        playerId: player.id,
                        status: financial_transaction_entity_1.TransactionStatus.COMPLETED
                    },
                    order: { createdAt: 'DESC' }
                });
            }
            catch (dbError) {
                console.error('Database error fetching transactions:', dbError);
                transactions = [];
            }
            let availableBalance = 0;
            for (const txn of transactions) {
                try {
                    const amount = Number(txn.amount);
                    if (isNaN(amount)) {
                        console.warn('Invalid transaction amount:', txn.id, txn.amount);
                        continue;
                    }
                    if (['Deposit', 'Credit', 'Bonus', 'Refund'].includes(txn.type)) {
                        availableBalance += amount;
                    }
                    else if (['Cashout', 'Withdrawal', 'Buy In'].includes(txn.type)) {
                        availableBalance -= amount;
                    }
                }
                catch (calcError) {
                    console.error('Error calculating balance from transaction:', txn.id, calcError);
                }
            }
            availableBalance = Math.max(0, availableBalance);
            const waitlistEntry = await this.waitlistRepo.findOne({
                where: {
                    club: { id: clubId.trim() },
                    email: player.email,
                    status: waitlist_entry_entity_1.WaitlistStatus.SEATED
                },
                relations: ['club']
            });
            let tableBalance = 0;
            let tableId = null;
            let seatNumber = null;
            if (waitlistEntry && waitlistEntry.tableNumber) {
                const table = await this.tablesRepo.findOne({
                    where: { club: { id: clubId.trim() }, tableNumber: waitlistEntry.tableNumber }
                });
                if (table) {
                    tableId = table.id;
                    tableBalance = 0;
                }
            }
            const creditEnabled = player.creditEnabled || false;
            const creditLimit = player.creditLimit || 0;
            const creditUsed = 0;
            const availableCredit = creditEnabled ? Math.max(0, creditLimit - creditUsed) : 0;
            return {
                availableBalance: Math.max(0, availableBalance),
                tableBalance,
                totalBalance: Math.max(0, availableBalance) + tableBalance,
                tableId,
                seatNumber: (waitlistEntry === null || waitlistEntry === void 0 ? void 0 : waitlistEntry.tableNumber) || null,
                creditEnabled,
                creditLimit,
                availableCredit
            };
        }
        catch (err) {
            console.error('Get player balance error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get player balance');
        }
    }
    async getPlayerTransactions(playerId, clubId, limit = 50, offset = 0) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (limit === null || limit === undefined || typeof limit !== 'number' || isNaN(limit)) {
                throw new common_1.BadRequestException('Limit must be a valid number');
            }
            if (limit < 1) {
                throw new common_1.BadRequestException('Limit must be at least 1');
            }
            if (limit > 100) {
                throw new common_1.BadRequestException('Limit cannot exceed 100');
            }
            if (offset === null || offset === undefined || typeof offset !== 'number' || isNaN(offset)) {
                throw new common_1.BadRequestException('Offset must be a valid number');
            }
            if (offset < 0) {
                throw new common_1.BadRequestException('Offset must be 0 or greater');
            }
            if (offset > 10000) {
                throw new common_1.BadRequestException('Offset cannot exceed 10000');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot access transactions.');
            }
            let transactions = [];
            let total = 0;
            try {
                [transactions, total] = await this.transactionsRepo.findAndCount({
                    where: {
                        club: { id: clubId.trim() },
                        playerId: player.id
                    },
                    order: { createdAt: 'DESC' },
                    take: limit,
                    skip: offset
                });
            }
            catch (dbError) {
                console.error('Database error fetching transactions:', dbError);
                throw new common_1.BadRequestException('Unable to fetch transactions. Please try again.');
            }
            const mappedTransactions = transactions.map(t => {
                try {
                    const amount = Number(t.amount);
                    return {
                        id: t.id,
                        type: t.type || 'Unknown',
                        amount: isNaN(amount) ? 0 : amount,
                        status: t.status || 'Unknown',
                        notes: t.notes ? t.notes.trim() : null,
                        createdAt: t.createdAt,
                        updatedAt: t.updatedAt
                    };
                }
                catch (mapError) {
                    console.error('Error mapping transaction:', t.id, mapError);
                    return null;
                }
            }).filter(t => t !== null);
            return {
                transactions: mappedTransactions,
                total: Math.max(0, total),
                limit,
                offset,
                hasMore: (offset + limit) < total
            };
        }
        catch (err) {
            console.error('Get player transactions error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get player transactions');
        }
    }
    async joinWaitlist(playerId, clubId, tableType, partySize = 1) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (partySize === null || partySize === undefined || typeof partySize !== 'number' || isNaN(partySize)) {
                throw new common_1.BadRequestException('Party size must be a valid number');
            }
            if (partySize < 1) {
                throw new common_1.BadRequestException('Party size must be at least 1');
            }
            if (partySize > 10) {
                throw new common_1.BadRequestException('Party size cannot exceed 10');
            }
            if (!Number.isInteger(partySize)) {
                throw new common_1.BadRequestException('Party size must be a whole number');
            }
            if (tableType !== null && tableType !== undefined) {
                if (typeof tableType !== 'string') {
                    throw new common_1.BadRequestException('Table type must be a string');
                }
                const trimmedTableType = tableType.trim();
                if (trimmedTableType.length > 50) {
                    throw new common_1.BadRequestException('Table type cannot exceed 50 characters');
                }
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const kycStatusWaitlist = player.kycStatus || 'pending';
            if (kycStatusWaitlist !== 'approved' && kycStatusWaitlist !== 'verified') {
                throw new common_1.ForbiddenException('Please complete KYC verification before joining the waitlist. Submit your KYC documents for approval.');
            }
            if (!player.club || player.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot join waitlist.');
            }
            if (player.status && player.status.toLowerCase() === 'inactive') {
                throw new common_1.ForbiddenException('Account is inactive. Please contact support.');
            }
            const existingEntry = await this.waitlistRepo.findOne({
                where: {
                    club: { id: clubId.trim() },
                    email: player.email,
                    status: waitlist_entry_entity_1.WaitlistStatus.PENDING
                }
            });
            if (existingEntry) {
                throw new common_1.ConflictException('You are already on the waitlist');
            }
            const seatedEntry = await this.waitlistRepo.findOne({
                where: {
                    club: { id: clubId.trim() },
                    email: player.email,
                    status: waitlist_entry_entity_1.WaitlistStatus.SEATED
                }
            });
            if (seatedEntry) {
                throw new common_1.ConflictException('You are already seated at a table');
            }
            let tablesCount = 0;
            try {
                tablesCount = await this.tablesRepo.count({
                    where: { club: { id: clubId.trim() } }
                });
            }
            catch (dbError) {
                console.error('Database error counting tables:', dbError);
                throw new common_1.BadRequestException('Unable to verify tables. Please try again.');
            }
            if (tablesCount === 0) {
                throw new common_1.BadRequestException('No tables are configured for this club. Please contact the club administrator.');
            }
            let minBuyInRequired = 0;
            try {
                const whereClause = {
                    club: { id: clubId.trim() }
                };
                if (tableType && tableType.trim()) {
                    whereClause.tableType = tableType.trim();
                }
                const tables = await this.tablesRepo.find({
                    where: whereClause
                });
                const buyIns = tables
                    .map(t => t.minBuyIn)
                    .filter(buyIn => buyIn !== null && buyIn !== undefined && buyIn > 0)
                    .map(buyIn => parseFloat(String(buyIn)) || 0);
                if (buyIns.length > 0) {
                    minBuyInRequired = Math.min(...buyIns);
                }
            }
            catch (dbError) {
                console.error('Database error checking minimum buy-in:', dbError);
            }
            if (minBuyInRequired > 0) {
                const playerBalance = await this.getPlayerBalance(playerId.trim(), clubId.trim());
                const totalAvailableBalance = playerBalance.totalBalance || playerBalance.availableBalance || 0;
                if (totalAvailableBalance < minBuyInRequired) {
                    throw new common_1.BadRequestException(`Insufficient balance. Minimum buy-in required: ₹${minBuyInRequired.toLocaleString()}, ` +
                        `Your current balance: ₹${totalAvailableBalance.toLocaleString()}. ` +
                        `Please add funds to your account before joining the waitlist.`);
                }
            }
            if (tableType && tableType.trim()) {
                let availableTables = [];
                try {
                    availableTables = await this.tablesRepo.find({
                        where: {
                            club: { id: clubId.trim() },
                            tableType: tableType.trim(),
                            status: table_entity_1.TableStatus.AVAILABLE
                        }
                    });
                }
                catch (dbError) {
                    console.error('Database error checking available tables:', dbError);
                }
                if (availableTables.length === 0) {
                }
            }
            let entry;
            try {
                entry = await this.waitlistSeatingService.createWaitlistEntry(clubId.trim(), {
                    playerName: player.name.trim(),
                    playerId: player.id,
                    phoneNumber: player.phoneNumber ? player.phoneNumber.trim() : undefined,
                    email: player.email.trim().toLowerCase(),
                    partySize,
                    tableType: tableType && tableType.trim() ? tableType.trim() : undefined
                });
            }
            catch (createError) {
                console.error('Error creating waitlist entry:', createError);
                if (createError instanceof common_1.BadRequestException || createError instanceof common_1.ConflictException) {
                    throw createError;
                }
                throw new common_1.BadRequestException('Failed to join waitlist. Please try again.');
            }
            if (!entry || !entry.id) {
                throw new common_1.BadRequestException('Failed to create waitlist entry. Please try again.');
            }
            let allPending = [];
            try {
                allPending = await this.waitlistRepo.find({
                    where: {
                        club: { id: clubId.trim() },
                        status: waitlist_entry_entity_1.WaitlistStatus.PENDING
                    },
                    order: {
                        priority: 'DESC',
                        createdAt: 'ASC'
                    }
                });
            }
            catch (dbError) {
                console.error('Database error fetching waitlist:', dbError);
            }
            const position = allPending.findIndex(e => e.id === entry.id) + 1;
            let availableTablesCount = 0;
            try {
                availableTablesCount = await this.tablesRepo.count({
                    where: {
                        club: { id: clubId.trim() },
                        status: table_entity_1.TableStatus.AVAILABLE
                    }
                });
            }
            catch (dbError) {
                console.error('Database error counting available tables:', dbError);
            }
            return {
                entry: {
                    id: entry.id,
                    playerName: entry.playerName,
                    partySize: entry.partySize,
                    tableType: entry.tableType,
                    status: entry.status,
                    createdAt: entry.createdAt
                },
                position,
                totalInQueue: allPending.length,
                availableTables: availableTablesCount,
                message: availableTablesCount === 0
                    ? 'No tables are currently available. You will be notified when a table becomes available.'
                    : undefined
            };
        }
        catch (err) {
            console.error('Join waitlist error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ConflictException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to join waitlist');
        }
    }
    async getWaitlistStatus(playerId, clubId) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot access waitlist status.');
            }
            let entry = null;
            try {
                entry = await this.waitlistRepo.findOne({
                    where: {
                        club: { id: clubId.trim() },
                        playerId: playerId.trim(),
                        status: waitlist_entry_entity_1.WaitlistStatus.PENDING
                    },
                    order: { createdAt: 'DESC' }
                });
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to fetch waitlist status. Please try again.');
            }
            if (!entry) {
                const tablesCount = await this.tablesRepo.count({
                    where: { club: { id: clubId.trim() } }
                });
                const availableTables = await this.tablesRepo.count({
                    where: {
                        club: { id: clubId.trim() },
                        status: table_entity_1.TableStatus.AVAILABLE
                    }
                });
                return {
                    onWaitlist: false,
                    entry: null,
                    position: null,
                    totalInQueue: 0,
                    availableTables: tablesCount > 0 ? availableTables : null,
                    message: tablesCount === 0
                        ? 'No tables are configured for this club.'
                        : availableTables === 0
                            ? 'No tables are currently available.'
                            : undefined
                };
            }
            let position = null;
            let totalInQueue = 0;
            let availableTables = 0;
            if (entry.status === waitlist_entry_entity_1.WaitlistStatus.PENDING) {
                let allPending = [];
                try {
                    allPending = await this.waitlistRepo.find({
                        where: {
                            club: { id: clubId.trim() },
                            status: waitlist_entry_entity_1.WaitlistStatus.PENDING
                        },
                        order: {
                            priority: 'DESC',
                            createdAt: 'ASC'
                        }
                    });
                }
                catch (dbError) {
                    console.error('Database error fetching pending waitlist:', dbError);
                }
                position = allPending.findIndex(e => e.id === entry.id) + 1;
                totalInQueue = allPending.length;
                try {
                    availableTables = await this.tablesRepo.count({
                        where: {
                            club: { id: clubId.trim() },
                            status: table_entity_1.TableStatus.AVAILABLE
                        }
                    });
                }
                catch (dbError) {
                    console.error('Database error counting available tables:', dbError);
                }
            }
            return {
                onWaitlist: true,
                entry: {
                    id: entry.id,
                    playerName: entry.playerName,
                    partySize: entry.partySize,
                    tableType: entry.tableType,
                    status: entry.status,
                    tableNumber: entry.tableNumber,
                    createdAt: entry.createdAt
                },
                position,
                totalInQueue,
                availableTables: entry.status === waitlist_entry_entity_1.WaitlistStatus.PENDING ? availableTables : null,
                message: entry.status === waitlist_entry_entity_1.WaitlistStatus.PENDING && availableTables === 0
                    ? 'No tables are currently available. You will be notified when a table becomes available.'
                    : undefined
            };
        }
        catch (err) {
            console.error('Get waitlist status error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get waitlist status');
        }
    }
    async cancelWaitlist(playerId, clubId, entryId) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            if (!entryId || typeof entryId !== 'string' || !entryId.trim()) {
                throw new common_1.BadRequestException('Entry ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId.trim())) {
                throw new common_1.BadRequestException('Invalid entry ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot cancel waitlist.');
            }
            let entry = null;
            try {
                entry = await this.waitlistRepo.findOne({
                    where: {
                        id: entryId.trim(),
                        club: { id: clubId.trim() },
                        email: player.email.trim().toLowerCase()
                    }
                });
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to fetch waitlist entry. Please try again.');
            }
            if (!entry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (entry.email && entry.email.toLowerCase() !== player.email.trim().toLowerCase()) {
                throw new common_1.ForbiddenException('You can only cancel your own waitlist entries');
            }
            if (entry.status === waitlist_entry_entity_1.WaitlistStatus.SEATED) {
                throw new common_1.BadRequestException('Cannot cancel a seated entry. Please contact staff to unseat.');
            }
            if (entry.status === waitlist_entry_entity_1.WaitlistStatus.CANCELLED) {
                throw new common_1.BadRequestException('Entry is already cancelled');
            }
            if (entry.status === waitlist_entry_entity_1.WaitlistStatus.NO_SHOW) {
                throw new common_1.BadRequestException('Cannot cancel a no-show entry');
            }
            await this.waitlistSeatingService.cancelWaitlistEntry(clubId.trim(), entryId.trim());
            return { success: true, message: 'Waitlist entry cancelled successfully' };
        }
        catch (err) {
            console.error('Cancel waitlist error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to cancel waitlist entry');
        }
    }
    async getAvailableTables(clubId) {
        try {
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (!club.id || !club.name) {
                throw new common_1.BadRequestException('Club data is incomplete. Please contact support.');
            }
            let tables = [];
            try {
                tables = await this.tablesRepo.find({
                    where: {
                        club: { id: clubId.trim() },
                        status: table_entity_1.TableStatus.AVAILABLE
                    },
                    relations: ['club'],
                    order: { tableNumber: 'ASC' }
                });
            }
            catch (dbError) {
                console.error('Database error fetching tables:', dbError);
                console.error('Error details:', dbError);
                throw new common_1.BadRequestException('Unable to fetch tables. Please try again.');
            }
            if (tables.length === 0) {
                let allTablesCount = 0;
                try {
                    allTablesCount = await this.tablesRepo.count({
                        where: { club: { id: clubId.trim() } }
                    });
                }
                catch (dbError) {
                    console.error('Database error counting tables:', dbError);
                }
                return {
                    tables: [],
                    totalAvailable: 0,
                    totalTables: allTablesCount,
                    message: allTablesCount === 0
                        ? 'No tables are configured for this club.'
                        : 'No tables are currently available. All tables may be occupied or reserved.'
                };
            }
            const mappedTables = tables.map(t => {
                try {
                    const maxSeats = Number(t.maxSeats) || 0;
                    const currentSeats = Number(t.currentSeats) || 0;
                    const availableSeats = Math.max(0, maxSeats - currentSeats);
                    return {
                        id: t.id,
                        tableNumber: t.tableNumber || 0,
                        tableType: t.tableType || 'Unknown',
                        maxSeats,
                        currentSeats,
                        availableSeats,
                        minBuyIn: Number(t.minBuyIn) || 0,
                        maxBuyIn: Number(t.maxBuyIn) || 0,
                        status: t.status || 'Unknown'
                    };
                }
                catch (mapError) {
                    console.error('Error mapping table:', t.id, mapError);
                    return null;
                }
            }).filter(t => t !== null);
            return {
                tables: mappedTables,
                totalAvailable: mappedTables.length,
                totalTables: mappedTables.length
            };
        }
        catch (err) {
            console.error('Get available tables error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get available tables');
        }
    }
    async getTableDetails(clubId, tableId) {
        try {
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            if (!tableId || typeof tableId !== 'string' || !tableId.trim()) {
                throw new common_1.BadRequestException('Table ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(tableId.trim())) {
                throw new common_1.BadRequestException('Invalid table ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            let table = null;
            try {
                table = await this.tablesRepo.findOne({
                    where: {
                        id: tableId.trim(),
                        club: { id: clubId.trim() }
                    }
                });
            }
            catch (dbError) {
                console.error('Database error fetching table:', dbError);
                throw new common_1.BadRequestException('Unable to fetch table details. Please try again.');
            }
            if (!table) {
                throw new common_1.NotFoundException('Table not found');
            }
            if (!table.club || table.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Table does not belong to this club');
            }
            if (!table.id || !table.tableNumber) {
                throw new common_1.BadRequestException('Table data is incomplete. Please contact support.');
            }
            const maxSeats = Number(table.maxSeats) || 0;
            const currentSeats = Number(table.currentSeats) || 0;
            const availableSeats = Math.max(0, maxSeats - currentSeats);
            return {
                id: table.id,
                tableNumber: table.tableNumber || 0,
                tableType: table.tableType || 'Unknown',
                maxSeats,
                currentSeats,
                availableSeats,
                minBuyIn: Number(table.minBuyIn) || 0,
                maxBuyIn: Number(table.maxBuyIn) || 0,
                status: table.status || 'Unknown',
                notes: table.notes ? table.notes.trim() : null
            };
        }
        catch (err) {
            console.error('Get table details error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get table details');
        }
    }
    async requestCredit(playerId, clubId, amount, notes) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (amount === null || amount === undefined) {
                throw new common_1.BadRequestException('Amount is required');
            }
            if (typeof amount !== 'number') {
                throw new common_1.BadRequestException('Amount must be a number');
            }
            if (isNaN(amount)) {
                throw new common_1.BadRequestException('Amount must be a valid number');
            }
            if (amount <= 0) {
                throw new common_1.BadRequestException('Amount must be greater than 0');
            }
            if (amount > 1000000) {
                throw new common_1.BadRequestException('Amount cannot exceed ₹1,000,000');
            }
            if (amount < 1) {
                throw new common_1.BadRequestException('Amount must be at least ₹1');
            }
            if (amount < 0.01) {
                throw new common_1.BadRequestException('Amount is too small');
            }
            if (notes !== null && notes !== undefined) {
                if (typeof notes !== 'string') {
                    throw new common_1.BadRequestException('Notes must be a string');
                }
                if (notes.trim().length > 500) {
                    throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
                }
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const kycStatusCredit = player.kycStatus || 'pending';
            if (kycStatusCredit !== 'approved' && kycStatusCredit !== 'verified') {
                throw new common_1.ForbiddenException('Please complete KYC verification before requesting credit. Submit your KYC documents for approval.');
            }
            const creditEnabled = player.creditEnabled || false;
            if (!creditEnabled) {
                throw new common_1.ForbiddenException('Credit facility is not enabled for your account. Please contact club management to enable credit before requesting.');
            }
            if (!player.club || player.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot request credit.');
            }
            if (player.status && player.status.toLowerCase() === 'inactive') {
                throw new common_1.ForbiddenException('Account is inactive. Please contact support.');
            }
            let creditRequest;
            try {
                creditRequest = await this.creditRequestsService.create(clubId.trim(), {
                    playerId: player.id,
                    playerName: player.name.trim(),
                    amount,
                    notes: notes && notes.trim() ? notes.trim() : undefined
                });
            }
            catch (createError) {
                console.error('Error creating credit request:', createError);
                if (createError instanceof common_1.BadRequestException || createError instanceof common_1.NotFoundException || createError instanceof common_1.ConflictException) {
                    throw createError;
                }
                throw new common_1.BadRequestException('Failed to create credit request. Please try again.');
            }
            if (!creditRequest || !creditRequest.id) {
                throw new common_1.BadRequestException('Credit request creation failed. Please try again.');
            }
            return {
                success: true,
                message: 'Credit request submitted successfully',
                requestId: creditRequest.id,
                amount: Number(creditRequest.amount),
                status: creditRequest.status,
                createdAt: creditRequest.createdAt
            };
        }
        catch (err) {
            console.error('Request credit error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to request credit');
        }
    }
    async placeFnbOrder(playerId, clubId, orderData) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const kycStatusFnb = player.kycStatus || 'pending';
            if (kycStatusFnb !== 'approved' && kycStatusFnb !== 'verified') {
                throw new common_1.ForbiddenException('Please complete KYC verification before placing food orders. Submit your KYC documents for approval.');
            }
            if (!player.club || player.club.id !== clubId.trim()) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot place orders.');
            }
            if (player.status && player.status.toLowerCase() === 'inactive') {
                throw new common_1.ForbiddenException('Account is inactive. Please contact support.');
            }
            if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
                throw new common_1.BadRequestException('Order must contain at least one item');
            }
            const fnbOrder = await this.fnbService.createOrder(clubId.trim(), {
                playerName: orderData.playerName || player.name,
                playerId: player.id,
                tableNumber: orderData.tableNumber || 'N/A',
                items: orderData.items.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price) || 0,
                })),
                totalAmount: parseFloat(orderData.totalAmount) || 0,
                specialInstructions: orderData.notes || undefined,
            }, player.name);
            return {
                success: true,
                message: 'Order received successfully',
                orderId: fnbOrder.id,
                orderNumber: fnbOrder.orderNumber,
                status: fnbOrder.status,
                createdAt: fnbOrder.createdAt,
            };
        }
        catch (err) {
            console.error('Place FNB order error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException || err instanceof common_1.ForbiddenException) {
                throw err;
            }
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';
            throw new common_1.BadRequestException('Failed to place order: ' + errorMessage);
        }
    }
    async getPlayerStats(playerId, clubId) {
        try {
            if (!playerId || typeof playerId !== 'string' || !playerId.trim()) {
                throw new common_1.BadRequestException('Player ID is required');
            }
            if (!clubId || typeof clubId !== 'string' || !clubId.trim()) {
                throw new common_1.BadRequestException('Club ID is required');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId.trim());
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Account is suspended. Cannot access stats.');
            }
            let transactions = [];
            try {
                transactions = await this.transactionsRepo.find({
                    where: {
                        club: { id: clubId.trim() },
                        playerId: player.id,
                        status: financial_transaction_entity_1.TransactionStatus.COMPLETED
                    },
                    order: { createdAt: 'DESC' }
                });
            }
            catch (dbError) {
                console.error('Database error fetching transactions for stats:', dbError);
            }
            let totalDeposits = 0;
            let totalWithdrawals = 0;
            let totalBuyIns = 0;
            for (const txn of transactions) {
                try {
                    const amount = Number(txn.amount);
                    if (isNaN(amount)) {
                        console.warn('Invalid transaction amount in stats:', txn.id);
                        continue;
                    }
                    if (['Deposit', 'Credit', 'Bonus'].includes(txn.type)) {
                        totalDeposits += amount;
                    }
                    else if (['Cashout', 'Withdrawal'].includes(txn.type)) {
                        totalWithdrawals += amount;
                    }
                    else if (txn.type === 'Buy In') {
                        totalBuyIns += amount;
                    }
                }
                catch (calcError) {
                    console.error('Error calculating stats from transaction:', txn.id, calcError);
                }
            }
            totalDeposits = Math.max(0, totalDeposits);
            totalWithdrawals = Math.max(0, totalWithdrawals);
            totalBuyIns = Math.max(0, totalBuyIns);
            return {
                totalSpent: Math.max(0, Number(player.totalSpent) || 0),
                totalCommission: Math.max(0, Number(player.totalCommission) || 0),
                totalDeposits,
                totalWithdrawals,
                totalBuyIns,
                totalTransactions: transactions.length,
                accountStatus: player.status || 'Active',
                memberSince: player.createdAt || new Date()
            };
        }
        catch (err) {
            console.error('Get player stats error:', err);
            if (err instanceof common_1.BadRequestException || err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get player stats');
        }
    }
    async getPlayerFnbMenu(clubId, category) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            let query = `
        SELECT 
          id, 
          name, 
          description,
          category,
          price,
          is_available as "isAvailable",
          image_url as "imageUrl"
        FROM fnb_menu 
        WHERE club_id = $1 AND is_available = true
      `;
            const params = [clubId];
            if (category) {
                query += ` AND LOWER(category) = LOWER($2)`;
                params.push(category);
            }
            query += ` ORDER BY category ASC, name ASC`;
            const menuItems = await this.playersRepo.query(query, params);
            return {
                menuItems: menuItems.map((item) => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    category: item.category,
                    price: parseFloat(item.price),
                    isAvailable: item.isAvailable,
                    imageUrl: item.imageUrl,
                })),
                total: menuItems.length,
            };
        }
        catch (err) {
            console.error('Get player F&B menu error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get menu');
        }
    }
    async getPlayerFnbOrders(playerId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId.trim())) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId.trim())) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId.trim(), club: { id: clubId.trim() } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const orders = await this.fnbService.getOrders(clubId.trim(), {
                playerId: playerId.trim(),
            });
            return {
                success: true,
                orders: orders.map((order) => ({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    tableNumber: order.tableNumber,
                    items: order.items,
                    totalAmount: order.totalAmount,
                    status: order.status,
                    createdAt: order.createdAt,
                    updatedAt: order.updatedAt,
                    statusHistory: order.statusHistory,
                })),
            };
        }
        catch (err) {
            console.error('Get player FNB orders error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get orders');
        }
    }
    async submitPlayerFeedback(playerId, clubId, message, rating) {
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
            await this.playersRepo.query(`
        INSERT INTO player_feedback (player_id, club_id, message, rating, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT DO NOTHING
      `, [playerId, clubId, message, rating || null]);
            return {
                success: true,
                message: 'Feedback submitted successfully',
                submittedAt: new Date().toISOString(),
            };
        }
        catch (err) {
            console.error('Submit feedback error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to submit feedback');
        }
    }
    async getPlayerFeedbackHistory(playerId, clubId) {
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
            const rows = await this.playersRepo.query(`
        SELECT id, message, rating, created_at
        FROM player_feedback
        WHERE player_id = $1 AND club_id = $2
        ORDER BY created_at DESC
        LIMIT 50
      `, [playerId, clubId]);
            return {
                success: true,
                feedback: rows,
            };
        }
        catch (err) {
            console.error('Get feedback history error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to fetch feedback history');
        }
    }
    async requestProfileFieldChange(playerId, clubId, fieldName, currentValue, requestedValue) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!fieldName || !fieldName.trim()) {
                throw new common_1.BadRequestException('Field name is required');
            }
            if (!requestedValue || !requestedValue.trim()) {
                throw new common_1.BadRequestException('Requested value is required');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            await this.playersRepo.query(`
        INSERT INTO player_profile_change_requests
          (player_id, club_id, field_name, current_value, requested_value, status, created_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
      `, [playerId, clubId, fieldName.trim(), currentValue, requestedValue]);
            return {
                success: true,
                message: 'Profile change request submitted',
            };
        }
        catch (err) {
            console.error('Profile change request error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to submit profile change request');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(7, (0, typeorm_1.InjectRepository)(user_tenant_role_entity_1.UserTenantRole)),
    __param(8, (0, typeorm_1.InjectRepository)(user_club_role_entity_1.UserClubRole)),
    __param(9, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __param(10, (0, typeorm_1.InjectRepository)(financial_transaction_entity_1.FinancialTransaction)),
    __param(11, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntry)),
    __param(12, (0, typeorm_1.InjectRepository)(table_entity_1.Table)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        clubs_service_1.ClubsService,
        fnb_service_1.FnbService,
        affiliates_service_1.AffiliatesService,
        financial_transactions_service_1.FinancialTransactionsService,
        waitlist_seating_service_1.WaitlistSeatingService,
        credit_requests_service_1.CreditRequestsService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AuthService);
//# sourceMappingURL=auth.service.js.map