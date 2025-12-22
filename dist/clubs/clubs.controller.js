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
exports.ClubsController = void 0;
const common_1 = require("@nestjs/common");
const create_club_dto_1 = require("./dto/create-club.dto");
const assign_admin_dto_1 = require("./dto/assign-admin.dto");
const create_club_user_dto_1 = require("./dto/create-club-user.dto");
const clubs_service_1 = require("./clubs.service");
const users_service_1 = require("../users/users.service");
const roles_guard_1 = require("../common/rbac/roles.guard");
const roles_decorator_1 = require("../common/rbac/roles.decorator");
const roles_1 = require("../common/rbac/roles");
const storage_service_1 = require("../storage/storage.service");
const staff_service_1 = require("./services/staff.service");
const credit_requests_service_1 = require("./services/credit-requests.service");
const financial_transactions_service_1 = require("./services/financial-transactions.service");
const vip_products_service_1 = require("./services/vip-products.service");
const club_settings_service_1 = require("./services/club-settings.service");
const audit_logs_service_1 = require("./services/audit-logs.service");
const staff_entity_1 = require("./entities/staff.entity");
const credit_request_entity_1 = require("./entities/credit-request.entity");
const financial_transaction_entity_1 = require("./entities/financial-transaction.entity");
const create_staff_dto_1 = require("./dto/create-staff.dto");
const update_staff_dto_1 = require("./dto/update-staff.dto");
const create_credit_request_dto_1 = require("./dto/create-credit-request.dto");
const approve_credit_dto_1 = require("./dto/approve-credit.dto");
const update_credit_visibility_dto_1 = require("./dto/update-credit-visibility.dto");
const update_credit_limit_dto_1 = require("./dto/update-credit-limit.dto");
const create_transaction_dto_1 = require("./dto/create-transaction.dto");
const update_transaction_dto_1 = require("./dto/update-transaction.dto");
const create_vip_product_dto_1 = require("./dto/create-vip-product.dto");
const update_vip_product_dto_1 = require("./dto/update-vip-product.dto");
const set_club_setting_dto_1 = require("./dto/set-club-setting.dto");
const create_waitlist_entry_dto_1 = require("./dto/create-waitlist-entry.dto");
const update_waitlist_entry_dto_1 = require("./dto/update-waitlist-entry.dto");
const create_table_dto_1 = require("./dto/create-table.dto");
const update_table_dto_1 = require("./dto/update-table.dto");
const assign_seat_dto_1 = require("./dto/assign-seat.dto");
const waitlist_seating_service_1 = require("./services/waitlist-seating.service");
const analytics_service_1 = require("./services/analytics.service");
const waitlist_entry_entity_1 = require("./entities/waitlist-entry.entity");
const table_entity_1 = require("./entities/table.entity");
const affiliates_service_1 = require("./services/affiliates.service");
const create_affiliate_dto_1 = require("./dto/create-affiliate.dto");
const create_player_dto_1 = require("./dto/create-player.dto");
const update_player_dto_1 = require("./dto/update-player.dto");
const verify_club_code_dto_1 = require("./dto/verify-club-code.dto");
const player_entity_1 = require("./entities/player.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const financial_transaction_entity_2 = require("./entities/financial-transaction.entity");
const affiliate_entity_1 = require("./entities/affiliate.entity");
const fnb_service_1 = require("./services/fnb.service");
const create_fnb_order_dto_1 = require("./dto/create-fnb-order.dto");
const update_fnb_order_dto_1 = require("./dto/update-fnb-order.dto");
const create_menu_item_dto_1 = require("./dto/create-menu-item.dto");
const update_menu_item_dto_1 = require("./dto/update-menu-item.dto");
const create_inventory_item_dto_1 = require("./dto/create-inventory-item.dto");
const update_inventory_item_dto_1 = require("./dto/update-inventory-item.dto");
const create_supplier_dto_1 = require("./dto/create-supplier.dto");
const update_supplier_dto_1 = require("./dto/update-supplier.dto");
const fnb_order_entity_1 = require("./entities/fnb-order.entity");
let ClubsController = class ClubsController {
    constructor(clubsService, storageService, usersService, staffService, creditRequestsService, financialTransactionsService, vipProductsService, clubSettingsService, auditLogsService, waitlistSeatingService, analyticsService, affiliatesService, fnbService, playersRepo, transactionsRepo, affiliatesRepo) {
        this.clubsService = clubsService;
        this.storageService = storageService;
        this.usersService = usersService;
        this.staffService = staffService;
        this.creditRequestsService = creditRequestsService;
        this.financialTransactionsService = financialTransactionsService;
        this.vipProductsService = vipProductsService;
        this.clubSettingsService = clubSettingsService;
        this.auditLogsService = auditLogsService;
        this.waitlistSeatingService = waitlistSeatingService;
        this.analyticsService = analyticsService;
        this.affiliatesService = affiliatesService;
        this.fnbService = fnbService;
        this.playersRepo = playersRepo;
        this.transactionsRepo = transactionsRepo;
        this.affiliatesRepo = affiliatesRepo;
    }
    async verifyClubCode(dto) {
        try {
            if (!dto) {
                return {
                    valid: false,
                    message: 'Request body is required'
                };
            }
            if (!dto.code || typeof dto.code !== 'string') {
                return {
                    valid: false,
                    message: 'Club code is required and must be a string'
                };
            }
            const trimmedCode = dto.code.trim();
            if (!trimmedCode) {
                return {
                    valid: false,
                    message: 'Club code cannot be empty'
                };
            }
            if (trimmedCode.length !== 6) {
                return {
                    valid: false,
                    message: 'Club code must be exactly 6 digits'
                };
            }
            if (!/^\d{6}$/.test(trimmedCode)) {
                return {
                    valid: false,
                    message: 'Club code must contain only digits'
                };
            }
            const dangerousChars = [';', '--', '/*', '*/', "'", '"', '\\', '<', '>', '&', '|', '`'];
            for (const char of dangerousChars) {
                if (trimmedCode.includes(char)) {
                    return {
                        valid: false,
                        message: 'Invalid club code format'
                    };
                }
            }
            if (/^0{6}$/.test(trimmedCode)) {
                return {
                    valid: false,
                    message: 'Invalid club code'
                };
            }
            let club;
            try {
                club = await this.clubsService.findByCode(trimmedCode);
            }
            catch (dbError) {
                console.error('Database error in verifyClubCode:', dbError);
                return {
                    valid: false,
                    message: 'Unable to verify club code. Please try again.'
                };
            }
            if (!club) {
                return {
                    valid: false,
                    message: 'Invalid club code'
                };
            }
            if (!club.code || typeof club.code !== 'string') {
                return {
                    valid: false,
                    message: 'Club code not configured'
                };
            }
            if (club.code !== trimmedCode) {
                return {
                    valid: false,
                    message: 'Invalid club code'
                };
            }
            if (!club.tenant) {
                return {
                    valid: false,
                    message: 'Club configuration error'
                };
            }
            if (!club.tenant.id) {
                return {
                    valid: false,
                    message: 'Club configuration error'
                };
            }
            if (!club.name || typeof club.name !== 'string') {
                return {
                    valid: false,
                    message: 'Club configuration error'
                };
            }
            if (!club.tenant || !club.tenant.id) {
                return {
                    valid: false,
                    message: 'Club configuration error'
                };
            }
            if (!club.id) {
                return {
                    valid: false,
                    message: 'Club configuration error'
                };
            }
            return {
                valid: true,
                clubId: club.id,
                clubName: club.name.trim(),
                tenantId: club.tenant.id,
                tenantName: (club.tenant.name || '').trim()
            };
        }
        catch (e) {
            console.error('Unexpected error in verifyClubCode:', e);
            return {
                valid: false,
                message: 'Unable to verify club code. Please try again.'
            };
        }
    }
    async list(tenantId) {
        try {
            if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
                throw new common_1.BadRequestException('x-tenant-id header is required and must be a non-empty string');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(tenantId.trim())) {
                throw new common_1.BadRequestException('Invalid tenant ID format');
            }
            const clubs = await this.clubsService.listByTenant(tenantId.trim());
            return clubs || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list clubs: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async create(tenantId, dto) {
        try {
            if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
                throw new common_1.BadRequestException('x-tenant-id header is required and must be a non-empty string');
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(tenantId.trim())) {
                throw new common_1.BadRequestException('Invalid tenant ID format');
            }
            if (!dto || !dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
                throw new common_1.BadRequestException('Club name is required and must be a non-empty string');
            }
            if (dto.name.trim().length < 2) {
                throw new common_1.BadRequestException('Club name must be at least 2 characters long');
            }
            if (dto.name.trim().length > 200) {
                throw new common_1.BadRequestException('Club name cannot exceed 200 characters');
            }
            return await this.clubsService.create(tenantId.trim(), dto.name.trim());
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create club: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createClubLogoUploadUrl(tenantId, id) {
        try {
            if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
                throw new common_1.BadRequestException('x-tenant-id header is required and must be a non-empty string');
            }
            const club = await this.clubsService.findById(id);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            await this.clubsService.validateClubBelongsToTenant(id, tenantId.trim());
            const path = `tenants/${tenantId.trim()}/clubs/${id}/logo.png`;
            return await this.storageService.createSignedUploadUrl(path);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create logo upload URL: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async assignAdmin(tenantId, clubId, dto) {
        try {
            if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
                throw new common_1.BadRequestException('x-tenant-id header is required and must be a non-empty string');
            }
            if (!dto || !dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
                throw new common_1.BadRequestException('Email is required and must be a non-empty string');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dto.email.trim())) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            let displayName = null;
            if (dto.displayName) {
                if (typeof dto.displayName !== 'string') {
                    throw new common_1.BadRequestException('Display name must be a string');
                }
                displayName = dto.displayName.trim() || null;
                if (displayName && displayName.length > 100) {
                    throw new common_1.BadRequestException('Display name cannot exceed 100 characters');
                }
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            let user = await this.usersService.findByEmail(dto.email.trim().toLowerCase());
            if (!user) {
                user = await this.usersService.createUser(dto.email.trim().toLowerCase(), displayName);
            }
            await this.usersService.assignClubRole(user.id, clubId, roles_1.ClubRole.ADMIN);
            return { message: 'Admin assigned successfully', userId: user.id };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ConflictException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to assign admin: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async listAdmins(tenantId, clubId) {
        try {
            if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
                throw new common_1.BadRequestException('x-tenant-id header is required and must be a non-empty string');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            const admins = await this.clubsService.listClubAdmins(clubId);
            return admins || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list admins: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async removeAdmin(tenantId, clubId, userId) {
        try {
            if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
                throw new common_1.BadRequestException('x-tenant-id header is required and must be a non-empty string');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            const targetUser = await this.usersService.findById(userId);
            if (!targetUser) {
                throw new common_1.NotFoundException('User not found');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            await this.usersService.removeClubRole(userId, clubId, roles_1.ClubRole.ADMIN);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to remove admin: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getClub(tenantId, headerClubId, clubId) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only access your assigned club');
                }
            }
            return club;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get club: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getClubRevenue(tenantId, clubId) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim()) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            const revenue = await this.clubsService.getClubRevenue(clubId);
            return revenue || { total: 0, transactions: [] };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get club revenue: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createClubUser(tenantId, headerClubId, clubId, dto) {
        try {
            if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
                throw new common_1.BadRequestException('Email is required and must be a non-empty string');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dto.email.trim())) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            if (!dto.role || typeof dto.role !== 'string') {
                throw new common_1.BadRequestException('Role is required');
            }
            if (!Object.values(roles_1.ClubRole).includes(dto.role)) {
                throw new common_1.BadRequestException(`Invalid club role. Must be one of: ${Object.values(roles_1.ClubRole).join(', ')}`);
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only create users for your assigned club');
            }
            let displayName = null;
            if (dto.displayName) {
                if (typeof dto.displayName !== 'string') {
                    throw new common_1.BadRequestException('Display name must be a string');
                }
                displayName = dto.displayName.trim() || null;
                if (displayName && displayName.length > 100) {
                    throw new common_1.BadRequestException('Display name cannot exceed 100 characters');
                }
            }
            const result = await this.usersService.createClubUser(dto.email.trim().toLowerCase(), displayName, clubId, dto.role);
            return {
                message: result.roleAlreadyAssigned
                    ? 'User already has this role for this club'
                    : result.isExistingUser
                        ? 'User assigned to club successfully'
                        : 'User created and assigned to club successfully',
                user: result.user,
                tempPassword: result.tempPassword,
                clubId: result.clubId,
                role: result.role,
                isExistingUser: result.isExistingUser,
                roleAlreadyAssigned: result.roleAlreadyAssigned
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ConflictException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create club user: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async listClubUsers(tenantId, headerClubId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for HR role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view users for your assigned club');
            }
            let users;
            try {
                users = await this.clubsService.listClubUsers(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club users:', dbError);
                throw new common_1.BadRequestException('Unable to fetch club users. Please try again.');
            }
            return users || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list club users: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async removeClubUserRole(tenantId, clubId, userId, role) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            if (!role || !role.trim()) {
                throw new common_1.BadRequestException('Role is required');
            }
            if (!Object.values(roles_1.ClubRole).includes(role)) {
                throw new common_1.BadRequestException('Invalid club role');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            await this.usersService.removeClubRole(userId, clubId, role);
        }
        catch (e) {
            throw e;
        }
    }
    async listStaff(tenantId, headerClubId, clubId) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only access staff from your assigned club');
            }
            const staff = await this.staffService.findAll(clubId);
            return staff || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getStaff(tenantId, headerClubId, clubId, staffId) {
        var _a, _b;
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(staffId)) {
                throw new common_1.BadRequestException('Invalid staff ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view staff for your assigned club');
            }
            let staff;
            try {
                staff = await this.staffService.findOne(staffId, clubId);
            }
            catch (dbError) {
                console.error('Database error fetching staff:', dbError);
                if (dbError instanceof common_1.NotFoundException) {
                    throw dbError;
                }
                throw new common_1.BadRequestException('Unable to fetch staff. Please try again.');
            }
            if (!staff) {
                throw new common_1.NotFoundException('Staff not found');
            }
            if (staff.club && staff.club.id !== clubId) {
                throw new common_1.ForbiddenException('Staff does not belong to this club');
            }
            if (!staff.id || !staff.name) {
                throw new common_1.BadRequestException('Staff data is incomplete or corrupted');
            }
            if (!staff.role || !Object.values(staff_entity_1.StaffRole).includes(staff.role)) {
                console.warn(`Staff ${staffId} has invalid role: ${staff.role}`);
            }
            if (!staff.status || !Object.values(staff_entity_1.StaffStatus).includes(staff.status)) {
                console.warn(`Staff ${staffId} has invalid status: ${staff.status}`);
            }
            return {
                id: staff.id,
                name: staff.name,
                role: staff.role,
                status: staff.status,
                employeeId: staff.employeeId || null,
                club: {
                    id: ((_a = staff.club) === null || _a === void 0 ? void 0 : _a.id) || clubId,
                    name: ((_b = staff.club) === null || _b === void 0 ? void 0 : _b.name) || null
                },
                createdAt: staff.createdAt,
                updatedAt: staff.updatedAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createStaff(tenantId, headerClubId, clubId, dto) {
        try {
            if (!dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
                throw new common_1.BadRequestException('Staff name is required and must be a non-empty string');
            }
            if (!dto.role || typeof dto.role !== 'string') {
                throw new common_1.BadRequestException('Staff role is required');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only create staff for your assigned club');
            }
            if (dto.employeeId && typeof dto.employeeId === 'string' && dto.employeeId.trim()) {
                if (dto.employeeId.trim().length > 50) {
                    throw new common_1.BadRequestException('Employee ID cannot exceed 50 characters');
                }
                if (!/^[a-zA-Z0-9\-_]+$/.test(dto.employeeId.trim())) {
                    throw new common_1.BadRequestException('Employee ID can only contain letters, numbers, hyphens, and underscores');
                }
            }
            return await this.staffService.create(clubId, dto.name, dto.role, dto.employeeId);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ConflictException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateStaff(tenantId, headerClubId, clubId, staffId, dto) {
        try {
            if (!dto || Object.keys(dto).length === 0) {
                throw new common_1.BadRequestException('At least one field must be provided for update');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only update staff from your assigned club');
            }
            const existingStaff = await this.staffService.findOne(staffId, clubId);
            if (!existingStaff) {
                throw new common_1.NotFoundException('Staff member not found');
            }
            if (dto.employeeId !== undefined && dto.employeeId !== null) {
                if (typeof dto.employeeId === 'string' && dto.employeeId.trim()) {
                    if (dto.employeeId.trim().length > 50) {
                        throw new common_1.BadRequestException('Employee ID cannot exceed 50 characters');
                    }
                    if (!/^[a-zA-Z0-9\-_]+$/.test(dto.employeeId.trim())) {
                        throw new common_1.BadRequestException('Employee ID can only contain letters, numbers, hyphens, and underscores');
                    }
                }
            }
            return await this.staffService.update(staffId, clubId, dto);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ConflictException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to update staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async removeStaff(tenantId, headerClubId, clubId, staffId) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only delete staff from your assigned club');
            }
            const existingStaff = await this.staffService.findOne(staffId, clubId);
            if (!existingStaff) {
                throw new common_1.NotFoundException('Staff member not found');
            }
            await this.staffService.remove(staffId, clubId);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to delete staff: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async listCreditRequests(tenantId, headerClubId, clubId, status) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only access credit requests from your assigned club');
                }
            }
            if (status && typeof status === 'string' && status.trim()) {
                if (!Object.values(credit_request_entity_1.CreditRequestStatus).includes(status.trim())) {
                    throw new common_1.BadRequestException(`Invalid credit request status. Must be one of: ${Object.values(credit_request_entity_1.CreditRequestStatus).join(', ')}`);
                }
            }
            const requests = await this.creditRequestsService.findAll(clubId, status === null || status === void 0 ? void 0 : status.trim());
            return requests || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list credit requests: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createCreditRequest(tenantId, headerClubId, clubId, dto) {
        var _a;
        try {
            if (!dto.playerName || typeof dto.playerName !== 'string' || !dto.playerName.trim()) {
                throw new common_1.BadRequestException('Player name is required and must be a non-empty string');
            }
            if (dto.playerName.trim().length < 2) {
                throw new common_1.BadRequestException('Player name must be at least 2 characters long');
            }
            if (dto.playerName.trim().length > 100) {
                throw new common_1.BadRequestException('Player name cannot exceed 100 characters');
            }
            if (dto.amount === null || dto.amount === undefined) {
                throw new common_1.BadRequestException('Amount is required');
            }
            const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
            if (isNaN(amount) || amount <= 0) {
                throw new common_1.BadRequestException('Requested amount must be a positive number');
            }
            if (amount > 10000000) {
                throw new common_1.BadRequestException('Requested amount cannot exceed ₹10,000,000');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only create credit requests for your assigned club');
            }
            return await this.creditRequestsService.create(clubId, {
                playerId: dto.playerId.trim(),
                playerName: dto.playerName.trim(),
                amount: amount,
                notes: ((_a = dto.notes) === null || _a === void 0 ? void 0 : _a.trim()) || undefined
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create credit request: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async approveCreditRequest(tenantId, headerClubId, clubId, requestId, dto) {
        var _a;
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(requestId)) {
                throw new common_1.BadRequestException('Invalid credit request ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for CASHIER role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only approve credit requests for your assigned club');
                }
            }
            if (dto && dto.limit !== undefined && dto.limit !== null) {
                const limit = typeof dto.limit === 'string' ? parseFloat(dto.limit) : Number(dto.limit);
                if (isNaN(limit) || limit <= 0) {
                    throw new common_1.BadRequestException('Credit limit must be a positive number');
                }
                if (limit > 10000000) {
                    throw new common_1.BadRequestException('Credit limit cannot exceed ₹10,000,000');
                }
            }
            let creditRequest;
            try {
                creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
            }
            catch (dbError) {
                console.error('Database error fetching credit request:', dbError);
                throw new common_1.BadRequestException('Unable to fetch credit request. Please try again.');
            }
            if (!creditRequest) {
                throw new common_1.NotFoundException('Credit request not found');
            }
            if (((_a = creditRequest.club) === null || _a === void 0 ? void 0 : _a.id) !== clubId) {
                throw new common_1.ForbiddenException('Credit request does not belong to this club');
            }
            if (creditRequest.status !== credit_request_entity_1.CreditRequestStatus.PENDING) {
                throw new common_1.BadRequestException(`Cannot approve credit request. Current status: ${creditRequest.status}`);
            }
            let creditLimit = undefined;
            if ((dto === null || dto === void 0 ? void 0 : dto.limit) !== undefined && (dto === null || dto === void 0 ? void 0 : dto.limit) !== null) {
                creditLimit = typeof dto.limit === 'string' ? parseFloat(dto.limit) : Number(dto.limit);
                if (isNaN(creditLimit) || creditLimit <= 0) {
                    throw new common_1.BadRequestException('Credit limit must be a positive number');
                }
                if (creditLimit > 10000000) {
                    throw new common_1.BadRequestException('Credit limit cannot exceed ₹10,000,000');
                }
                if (!isFinite(creditLimit)) {
                    throw new common_1.BadRequestException('Credit limit must be a finite number');
                }
            }
            let approvedRequest;
            try {
                approvedRequest = await this.creditRequestsService.approve(requestId, clubId, creditLimit);
            }
            catch (approveError) {
                console.error('Error approving credit request:', approveError);
                if (approveError instanceof common_1.BadRequestException || approveError instanceof common_1.ConflictException || approveError instanceof common_1.NotFoundException) {
                    throw approveError;
                }
                throw new common_1.BadRequestException('Unable to approve credit request. Please try again.');
            }
            if (!approvedRequest || !approvedRequest.id) {
                throw new common_1.BadRequestException('Credit request approval failed. Please try again.');
            }
            return approvedRequest;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to approve credit request: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async denyCreditRequest(tenantId, headerClubId, clubId, requestId) {
        var _a;
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(requestId)) {
                throw new common_1.BadRequestException('Invalid credit request ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for CASHIER role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only deny credit requests for your assigned club');
                }
            }
            let creditRequest;
            try {
                creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
            }
            catch (dbError) {
                console.error('Database error fetching credit request:', dbError);
                throw new common_1.BadRequestException('Unable to fetch credit request. Please try again.');
            }
            if (!creditRequest) {
                throw new common_1.NotFoundException('Credit request not found');
            }
            if (((_a = creditRequest.club) === null || _a === void 0 ? void 0 : _a.id) !== clubId) {
                throw new common_1.ForbiddenException('Credit request does not belong to this club');
            }
            if (creditRequest.status !== credit_request_entity_1.CreditRequestStatus.PENDING) {
                throw new common_1.BadRequestException(`Cannot deny credit request. Current status: ${creditRequest.status}`);
            }
            let deniedRequest;
            try {
                deniedRequest = await this.creditRequestsService.deny(requestId, clubId);
            }
            catch (denyError) {
                console.error('Error denying credit request:', denyError);
                if (denyError instanceof common_1.BadRequestException || denyError instanceof common_1.ConflictException || denyError instanceof common_1.NotFoundException) {
                    throw denyError;
                }
                throw new common_1.BadRequestException('Unable to deny credit request. Please try again.');
            }
            if (!deniedRequest || !deniedRequest.id) {
                throw new common_1.BadRequestException('Credit request denial failed. Please try again.');
            }
            return deniedRequest;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to deny credit request: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateCreditVisibility(tenantId, headerClubId, clubId, requestId, dto) {
        try {
            if (tenantId && typeof tenantId !== 'string') {
                throw new common_1.BadRequestException('x-tenant-id header must be a string');
            }
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            if (dto.visible === undefined || dto.visible === null) {
                throw new common_1.BadRequestException('Visible field is required');
            }
            if (typeof dto.visible !== 'boolean') {
                throw new common_1.BadRequestException('Visible field must be a boolean');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only update credit requests for your assigned club');
                }
            }
            const creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
            if (!creditRequest) {
                throw new common_1.NotFoundException('Credit request not found');
            }
            return await this.creditRequestsService.updateVisibility(requestId, clubId, dto.visible);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to update credit visibility: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateCreditLimit(tenantId, headerClubId, clubId, requestId, dto) {
        try {
            if (tenantId && typeof tenantId !== 'string') {
                throw new common_1.BadRequestException('x-tenant-id header must be a string');
            }
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            if (dto.limit === null || dto.limit === undefined) {
                throw new common_1.BadRequestException('Credit limit is required');
            }
            const limit = typeof dto.limit === 'string' ? parseFloat(dto.limit) : Number(dto.limit);
            if (isNaN(limit) || limit <= 0) {
                throw new common_1.BadRequestException('Credit limit must be a positive number');
            }
            if (limit > 10000000) {
                throw new common_1.BadRequestException('Credit limit cannot exceed ₹10,000,000');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only update credit requests for your assigned club');
                }
            }
            const creditRequest = await this.creditRequestsService.findOne(requestId, clubId);
            if (!creditRequest) {
                throw new common_1.NotFoundException('Credit request not found');
            }
            if (creditRequest.status !== credit_request_entity_1.CreditRequestStatus.APPROVED) {
                throw new common_1.BadRequestException(`Cannot update limit. Credit request must be approved. Current status: ${creditRequest.status}`);
            }
            return await this.creditRequestsService.updateLimit(requestId, clubId, limit);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to update credit limit: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async listTransactions(tenantId, headerClubId, clubId, status) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only access transactions from your assigned club');
                }
            }
            if (status && typeof status === 'string' && !Object.values(financial_transaction_entity_1.TransactionStatus).includes(status)) {
                throw new common_1.BadRequestException(`Invalid transaction status. Must be one of: ${Object.values(financial_transaction_entity_1.TransactionStatus).join(', ')}`);
            }
            const transactions = await this.financialTransactionsService.findAll(clubId, status);
            return transactions || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list transactions: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createTransaction(tenantId, headerClubId, clubId, dto) {
        try {
            if (!dto.playerName || typeof dto.playerName !== 'string' || !dto.playerName.trim()) {
                throw new common_1.BadRequestException('Player name is required and must be a non-empty string');
            }
            if (dto.playerName.trim().length < 2 || dto.playerName.trim().length > 100) {
                throw new common_1.BadRequestException('Player name must be between 2 and 100 characters');
            }
            if (!dto.type || typeof dto.type !== 'string') {
                throw new common_1.BadRequestException('Transaction type is required');
            }
            if (!Object.values(financial_transaction_entity_1.TransactionType).includes(dto.type)) {
                throw new common_1.BadRequestException(`Invalid transaction type. Must be one of: ${Object.values(financial_transaction_entity_1.TransactionType).join(', ')}`);
            }
            if (dto.amount === null || dto.amount === undefined) {
                throw new common_1.BadRequestException('Amount is required');
            }
            const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
            if (isNaN(amount) || amount <= 0) {
                throw new common_1.BadRequestException('Amount must be a positive number');
            }
            if (amount > 10000000) {
                throw new common_1.BadRequestException('Amount cannot exceed ₹10,000,000');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only create transactions for your assigned club');
                }
            }
            return await this.financialTransactionsService.create(clubId, {
                ...dto,
                playerName: dto.playerName.trim(),
                amount: amount
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateTransaction(tenantId, headerClubId, clubId, transactionId, dto) {
        var _a;
        try {
            if (!dto || typeof dto !== 'object' || Object.keys(dto).length === 0) {
                throw new common_1.BadRequestException('At least one field must be provided for update');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only update transactions for your assigned club');
                }
            }
            const transaction = await this.financialTransactionsService.findOne(transactionId, clubId);
            if (!transaction) {
                throw new common_1.NotFoundException('Transaction not found');
            }
            if (dto.amount !== undefined && dto.amount !== null) {
                const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
                if (isNaN(amount) || amount <= 0) {
                    throw new common_1.BadRequestException('Amount must be a positive number');
                }
                if (amount > 10000000) {
                    throw new common_1.BadRequestException('Amount cannot exceed ₹10,000,000');
                }
            }
            if (dto.status !== undefined && dto.status !== null) {
                if (typeof dto.status !== 'string' || !Object.values(financial_transaction_entity_1.TransactionStatus).includes(dto.status)) {
                    throw new common_1.BadRequestException(`Invalid transaction status. Must be one of: ${Object.values(financial_transaction_entity_1.TransactionStatus).join(', ')}`);
                }
            }
            if (dto.amount !== undefined && dto.amount !== null) {
                const amount = typeof dto.amount === 'string' ? parseFloat(dto.amount) : Number(dto.amount);
                if (isNaN(amount) || amount <= 0) {
                    throw new common_1.BadRequestException('Amount must be a positive number');
                }
            }
            if (dto.notes !== undefined && dto.notes !== null) {
                if (typeof dto.notes !== 'string') {
                    throw new common_1.BadRequestException('Notes must be a string');
                }
                if (dto.notes.trim().length > 500) {
                    throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
                }
            }
            return await this.financialTransactionsService.update(transactionId, clubId, {
                amount: dto.amount,
                notes: (_a = dto.notes) === null || _a === void 0 ? void 0 : _a.trim(),
                status: dto.status
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to update transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async cancelTransaction(tenantId, headerClubId, clubId, transactionId) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only cancel transactions for your assigned club');
                }
            }
            const transaction = await this.financialTransactionsService.findOne(transactionId, clubId);
            if (!transaction) {
                throw new common_1.NotFoundException('Transaction not found');
            }
            if (transaction.status === financial_transaction_entity_1.TransactionStatus.CANCELLED) {
                throw new common_1.BadRequestException('Transaction is already cancelled');
            }
            if (transaction.status === financial_transaction_entity_1.TransactionStatus.COMPLETED) {
                throw new common_1.BadRequestException('Cannot cancel a completed transaction');
            }
            return await this.financialTransactionsService.cancel(transactionId, clubId);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to cancel transaction: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async listVipProducts(tenantId, headerClubId, clubId) {
        try {
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only access VIP products from your assigned club');
                }
            }
            const products = await this.vipProductsService.findAll(clubId);
            return products || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to list VIP products: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createVipProduct(tenantId, headerClubId, clubId, dto) {
        var _a, _b;
        try {
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            if (!dto.title || typeof dto.title !== 'string' || !dto.title.trim()) {
                throw new common_1.BadRequestException('Product title is required and must be a non-empty string');
            }
            if (dto.title.trim().length < 2 || dto.title.trim().length > 200) {
                throw new common_1.BadRequestException('Product title must be between 2 and 200 characters');
            }
            if (dto.points === null || dto.points === undefined) {
                throw new common_1.BadRequestException('Points is required');
            }
            const points = typeof dto.points === 'string' ? parseInt(dto.points, 10) : Number(dto.points);
            if (isNaN(points) || points < 1) {
                throw new common_1.BadRequestException('Points must be at least 1');
            }
            if (points > 10000000) {
                throw new common_1.BadRequestException('Points cannot exceed 10,000,000');
            }
            if (dto.description && typeof dto.description === 'string' && dto.description.trim().length > 1000) {
                throw new common_1.BadRequestException('Description cannot exceed 1000 characters');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only create VIP products for your assigned club');
                }
            }
            return await this.vipProductsService.create(clubId, {
                title: dto.title.trim(),
                points: points,
                description: ((_a = dto.description) === null || _a === void 0 ? void 0 : _a.trim()) || undefined,
                imageUrl: ((_b = dto.imageUrl) === null || _b === void 0 ? void 0 : _b.trim()) || undefined
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create VIP product: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateVipProduct(tenantId, clubId, productId, dto) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            return this.vipProductsService.update(productId, clubId, dto);
        }
        catch (e) {
            throw e;
        }
    }
    async removeVipProduct(tenantId, clubId, productId) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            await this.vipProductsService.remove(productId, clubId);
        }
        catch (e) {
            throw e;
        }
    }
    async getClubSettings(tenantId, clubId) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            return this.clubSettingsService.getAllSettings(clubId);
        }
        catch (e) {
            throw e;
        }
    }
    async setClubSetting(tenantId, clubId, key, dto) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            if (!key || !key.trim()) {
                throw new common_1.BadRequestException('Setting key is required');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            return this.clubSettingsService.setSetting(clubId, key.trim(), dto.value);
        }
        catch (e) {
            throw e;
        }
    }
    async getClubStats(tenantId, headerClubId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view stats for your assigned club');
            }
            let staff = [];
            let creditRequests = [];
            let transactions = [];
            try {
                [staff, creditRequests, transactions] = await Promise.all([
                    this.staffService.findAll(clubId).catch(() => []),
                    this.creditRequestsService.findAll(clubId).catch(() => []),
                    this.financialTransactionsService.findAll(clubId).catch(() => [])
                ]);
            }
            catch (dbError) {
                console.error('Database error fetching stats:', dbError);
                throw new common_1.BadRequestException('Unable to fetch club stats. Please try again.');
            }
            if (!Array.isArray(staff))
                staff = [];
            if (!Array.isArray(creditRequests))
                creditRequests = [];
            if (!Array.isArray(transactions))
                transactions = [];
            return {
                totalStaff: staff.length,
                activeStaff: staff.filter(s => s && s.status === staff_entity_1.StaffStatus.ACTIVE).length,
                pendingCredit: creditRequests.filter(cr => cr && cr.status === credit_request_entity_1.CreditRequestStatus.PENDING).length,
                openOverrides: transactions.filter(t => t && t.status !== financial_transaction_entity_1.TransactionStatus.COMPLETED && t.status !== financial_transaction_entity_1.TransactionStatus.CANCELLED).length
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get club stats: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createWaitlistEntry(tenantId, headerClubId, clubId, dto) {
        var _a, _b, _c, _d, _e;
        try {
            if (!dto.playerName || typeof dto.playerName !== 'string' || !dto.playerName.trim()) {
                throw new common_1.BadRequestException('Player name is required and must be a non-empty string');
            }
            if (dto.playerName.trim().length < 2 || dto.playerName.trim().length > 100) {
                throw new common_1.BadRequestException('Player name must be between 2 and 100 characters');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only create waitlist entries for your assigned club');
            }
            return await this.waitlistSeatingService.createWaitlistEntry(clubId, {
                playerName: dto.playerName.trim(),
                playerId: (_a = dto.playerId) === null || _a === void 0 ? void 0 : _a.trim(),
                phoneNumber: (_b = dto.phoneNumber) === null || _b === void 0 ? void 0 : _b.trim(),
                email: (_c = dto.email) === null || _c === void 0 ? void 0 : _c.trim(),
                partySize: dto.partySize,
                priority: dto.priority,
                notes: (_d = dto.notes) === null || _d === void 0 ? void 0 : _d.trim(),
                tableType: (_e = dto.tableType) === null || _e === void 0 ? void 0 : _e.trim()
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getWaitlist(tenantId, headerClubId, clubId, status) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            if (status !== undefined && status !== null) {
                const validStatuses = Object.values(waitlist_entry_entity_1.WaitlistStatus);
                if (!validStatuses.includes(status)) {
                    throw new common_1.BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
                }
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view waitlist for your assigned club');
            }
            let waitlist;
            try {
                waitlist = await this.waitlistSeatingService.getWaitlist(clubId, status);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist:', dbError);
                throw new common_1.BadRequestException('Unable to fetch waitlist. Please try again.');
            }
            return waitlist || [];
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get waitlist: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getWaitlistEntry(tenantId, headerClubId, clubId, entryId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId)) {
                throw new common_1.BadRequestException('Invalid waitlist entry ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view waitlist entries for your assigned club');
            }
            let entry;
            try {
                entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to fetch waitlist entry. Please try again.');
            }
            if (!entry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (entry.club && entry.club.id !== clubId) {
                throw new common_1.ForbiddenException('Waitlist entry does not belong to this club');
            }
            return entry;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateWaitlistEntry(tenantId, headerClubId, clubId, entryId, dto) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId)) {
                throw new common_1.BadRequestException('Invalid waitlist entry ID format');
            }
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only update waitlist entries for your assigned club');
            }
            let existingEntry;
            try {
                existingEntry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to verify waitlist entry. Please try again.');
            }
            if (!existingEntry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (existingEntry.club && existingEntry.club.id !== clubId) {
                throw new common_1.ForbiddenException('Waitlist entry does not belong to this club');
            }
            if (existingEntry.status && (existingEntry.status === waitlist_entry_entity_1.WaitlistStatus.SEATED || existingEntry.status === waitlist_entry_entity_1.WaitlistStatus.CANCELLED)) {
                throw new common_1.BadRequestException(`Cannot update waitlist entry. Current status is: ${existingEntry.status}`);
            }
            if (dto.partySize !== undefined && dto.partySize !== null) {
                if (typeof dto.partySize !== 'number' || dto.partySize < 1 || dto.partySize > 20) {
                    throw new common_1.BadRequestException('Party size must be between 1 and 20');
                }
            }
            if (dto.priority !== undefined && dto.priority !== null) {
                if (typeof dto.priority !== 'number' || dto.priority < 0 || dto.priority > 100) {
                    throw new common_1.BadRequestException('Priority must be between 0 and 100');
                }
            }
            let updatedEntry;
            try {
                updatedEntry = await this.waitlistSeatingService.updateWaitlistEntry(clubId, entryId, dto);
            }
            catch (dbError) {
                console.error('Database error updating waitlist entry:', dbError);
                if (dbError instanceof common_1.NotFoundException || dbError instanceof common_1.BadRequestException) {
                    throw dbError;
                }
                throw new common_1.BadRequestException('Unable to update waitlist entry. Please try again.');
            }
            if (!updatedEntry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (!updatedEntry.id || updatedEntry.id !== entryId) {
                throw new common_1.BadRequestException('Update operation failed. Entry ID mismatch.');
            }
            return updatedEntry;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to update waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async cancelWaitlistEntry(tenantId, headerClubId, clubId, entryId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId)) {
                throw new common_1.BadRequestException('Invalid waitlist entry ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for GRE role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only cancel waitlist entries for your assigned club');
            }
            let entry;
            try {
                entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to verify waitlist entry. Please try again.');
            }
            if (!entry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (entry.club && entry.club.id !== clubId) {
                throw new common_1.ForbiddenException('Waitlist entry does not belong to this club');
            }
            if (!entry.status || entry.status !== waitlist_entry_entity_1.WaitlistStatus.PENDING) {
                throw new common_1.BadRequestException(`Cannot cancel waitlist entry. Current status: ${entry.status || 'Unknown'}. Only PENDING entries can be cancelled.`);
            }
            if (entry.cancelledAt) {
                throw new common_1.ConflictException('Waitlist entry is already cancelled');
            }
            let cancelledEntry;
            try {
                cancelledEntry = await this.waitlistSeatingService.cancelWaitlistEntry(clubId, entryId);
            }
            catch (cancelError) {
                console.error('Database error cancelling waitlist entry:', cancelError);
                if (cancelError instanceof common_1.NotFoundException || cancelError instanceof common_1.BadRequestException || cancelError instanceof common_1.ConflictException) {
                    throw cancelError;
                }
                throw new common_1.BadRequestException('Unable to cancel waitlist entry. Please try again.');
            }
            if (!cancelledEntry) {
                throw new common_1.NotFoundException('Waitlist entry not found or cancellation failed');
            }
            return cancelledEntry;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to cancel waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async deleteWaitlistEntry(tenantId, headerClubId, clubId, entryId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId)) {
                throw new common_1.BadRequestException('Invalid waitlist entry ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for GRE role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only delete waitlist entries for your assigned club');
            }
            let entry;
            try {
                entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to verify waitlist entry. Please try again.');
            }
            if (!entry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (entry.club && entry.club.id !== clubId) {
                throw new common_1.ForbiddenException('Waitlist entry does not belong to this club');
            }
            if (entry.status && entry.status === waitlist_entry_entity_1.WaitlistStatus.SEATED) {
                throw new common_1.ConflictException('Cannot delete waitlist entry for seated player. Please unseat first.');
            }
            if (entry.status && entry.status === waitlist_entry_entity_1.WaitlistStatus.CANCELLED) {
                console.log(`Deleting already cancelled waitlist entry: ${entryId}`);
            }
            try {
                await this.waitlistSeatingService.deleteWaitlistEntry(clubId, entryId);
            }
            catch (deleteError) {
                console.error('Database error deleting waitlist entry:', deleteError);
                if (deleteError instanceof common_1.NotFoundException || deleteError instanceof common_1.ConflictException) {
                    throw deleteError;
                }
                throw new common_1.BadRequestException('Unable to delete waitlist entry. Please try again.');
            }
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to delete waitlist entry: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async assignSeat(tenantId, headerClubId, userId, clubId, entryId, dto) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId)) {
                throw new common_1.BadRequestException('Invalid waitlist entry ID format');
            }
            if (!dto.tableId || !uuidRegex.test(dto.tableId)) {
                throw new common_1.BadRequestException('Invalid table ID format');
            }
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            const seatedBy = dto.seatedBy || userId;
            if (!seatedBy || typeof seatedBy !== 'string' || !seatedBy.trim()) {
                throw new common_1.BadRequestException('x-user-id header or seatedBy field is required');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only assign seats for your assigned club');
            }
            let entry;
            try {
                entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to verify waitlist entry. Please try again.');
            }
            if (!entry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (entry.club && entry.club.id !== clubId) {
                throw new common_1.ForbiddenException('Waitlist entry does not belong to this club');
            }
            if (entry.status && entry.status !== waitlist_entry_entity_1.WaitlistStatus.PENDING) {
                throw new common_1.BadRequestException(`Cannot assign seat. Waitlist entry status is: ${entry.status}`);
            }
            let table;
            try {
                table = await this.waitlistSeatingService.getTable(clubId, dto.tableId);
            }
            catch (dbError) {
                console.error('Database error fetching table:', dbError);
                throw new common_1.BadRequestException('Unable to verify table. Please try again.');
            }
            if (!table) {
                throw new common_1.NotFoundException('Table not found');
            }
            if (table.club && table.club.id !== clubId) {
                throw new common_1.ForbiddenException('Table does not belong to this club');
            }
            const partySize = entry.partySize || 1;
            if (table.currentSeats + partySize > table.maxSeats) {
                throw new common_1.BadRequestException(`Table only has ${table.maxSeats - table.currentSeats} available seats. Party size is ${partySize}.`);
            }
            if (table.status && table.status !== table_entity_1.TableStatus.AVAILABLE && table.status !== table_entity_1.TableStatus.RESERVED) {
                throw new common_1.BadRequestException(`Table is ${table.status.toLowerCase()}. Cannot assign seat.`);
            }
            if (seatedBy.trim().length < 1 || seatedBy.trim().length > 200) {
                throw new common_1.BadRequestException('seatedBy must be between 1 and 200 characters');
            }
            let assignedEntry;
            try {
                assignedEntry = await this.waitlistSeatingService.assignSeat(clubId, entryId, dto.tableId, seatedBy.trim());
            }
            catch (dbError) {
                console.error('Database error assigning seat:', dbError);
                if (dbError instanceof common_1.NotFoundException || dbError instanceof common_1.BadRequestException || dbError instanceof common_1.ConflictException) {
                    throw dbError;
                }
                throw new common_1.BadRequestException('Unable to assign seat. Please try again.');
            }
            if (!assignedEntry) {
                throw new common_1.NotFoundException('Waitlist entry not found or assignment failed');
            }
            if (!assignedEntry.id || assignedEntry.status !== waitlist_entry_entity_1.WaitlistStatus.SEATED) {
                throw new common_1.BadRequestException('Seat assignment failed. Entry was not properly seated.');
            }
            return assignedEntry;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to assign seat: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async unseatPlayer(tenantId, headerClubId, clubId, entryId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(entryId)) {
                throw new common_1.BadRequestException('Invalid waitlist entry ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only unseat players for your assigned club');
            }
            let entry;
            try {
                entry = await this.waitlistSeatingService.getWaitlistEntry(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist entry:', dbError);
                throw new common_1.BadRequestException('Unable to verify waitlist entry. Please try again.');
            }
            if (!entry) {
                throw new common_1.NotFoundException('Waitlist entry not found');
            }
            if (entry.club && entry.club.id !== clubId) {
                throw new common_1.ForbiddenException('Waitlist entry does not belong to this club');
            }
            if (!entry.status || entry.status !== waitlist_entry_entity_1.WaitlistStatus.SEATED) {
                throw new common_1.BadRequestException(`Cannot unseat player. Waitlist entry status is: ${entry.status || 'Unknown'}. Only SEATED entries can be unseated.`);
            }
            if (!entry.tableNumber) {
                throw new common_1.BadRequestException('Waitlist entry does not have a table assigned. Cannot unseat.');
            }
            let unseatedEntry;
            try {
                unseatedEntry = await this.waitlistSeatingService.unseatPlayer(clubId, entryId);
            }
            catch (dbError) {
                console.error('Database error unseating player:', dbError);
                if (dbError instanceof common_1.NotFoundException || dbError instanceof common_1.BadRequestException || dbError instanceof common_1.ConflictException) {
                    throw dbError;
                }
                throw new common_1.BadRequestException('Unable to unseat player. Please try again.');
            }
            if (!unseatedEntry) {
                throw new common_1.NotFoundException('Waitlist entry not found or unseat failed');
            }
            if (!unseatedEntry.id) {
                throw new common_1.BadRequestException('Unseat operation failed. Entry was not properly updated.');
            }
            return unseatedEntry;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to unseat player: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async createTable(tenantId, headerClubId, clubId, dto) {
        try {
            if (!dto.tableNumber || typeof dto.tableNumber !== 'number') {
                throw new common_1.BadRequestException('Table number is required and must be a number');
            }
            if (dto.tableNumber < 1) {
                throw new common_1.BadRequestException('Table number must be at least 1');
            }
            if (!dto.tableType || typeof dto.tableType !== 'string') {
                throw new common_1.BadRequestException('Table type is required');
            }
            if (!Object.values(table_entity_1.TableType).includes(dto.tableType)) {
                throw new common_1.BadRequestException(`Invalid table type. Must be one of: ${Object.values(table_entity_1.TableType).join(', ')}`);
            }
            if (dto.minBuyIn !== undefined && dto.minBuyIn !== null) {
                const minBuyIn = typeof dto.minBuyIn === 'string' ? parseFloat(dto.minBuyIn) : Number(dto.minBuyIn);
                if (isNaN(minBuyIn) || minBuyIn < 0) {
                    throw new common_1.BadRequestException('Minimum buy-in must be a non-negative number');
                }
            }
            if (dto.maxBuyIn !== undefined && dto.maxBuyIn !== null) {
                const maxBuyIn = typeof dto.maxBuyIn === 'string' ? parseFloat(dto.maxBuyIn) : Number(dto.maxBuyIn);
                if (isNaN(maxBuyIn) || maxBuyIn < 0) {
                    throw new common_1.BadRequestException('Maximum buy-in must be a non-negative number');
                }
                if (dto.minBuyIn !== undefined && dto.minBuyIn !== null) {
                    const minBuyIn = typeof dto.minBuyIn === 'string' ? parseFloat(dto.minBuyIn) : Number(dto.minBuyIn);
                    if (maxBuyIn < minBuyIn) {
                        throw new common_1.BadRequestException('Maximum buy-in cannot be less than minimum buy-in');
                    }
                }
            }
            if (!dto.maxSeats || typeof dto.maxSeats !== 'number') {
                throw new common_1.BadRequestException('Maximum seats is required and must be a number');
            }
            if (dto.maxSeats < 1 || dto.maxSeats > 20) {
                throw new common_1.BadRequestException('Maximum seats must be between 1 and 20');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only create tables for your assigned club');
            }
            return await this.waitlistSeatingService.createTable(clubId, {
                tableNumber: dto.tableNumber,
                tableType: dto.tableType,
                maxSeats: dto.maxSeats,
                minBuyIn: dto.minBuyIn,
                maxBuyIn: dto.maxBuyIn,
                notes: dto.notes
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to create table: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getTables(tenantId, headerClubId, clubId, status, tableType) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for CASHIER role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && typeof tenantId === 'string' && tenantId.trim() && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && typeof headerClubId === 'string' && headerClubId.trim()) {
                if (headerClubId.trim() !== clubId) {
                    throw new common_1.ForbiddenException('You can only view tables for your assigned club');
                }
            }
            if (status !== undefined && status !== null) {
                if (typeof status !== 'string' && typeof status !== 'number') {
                    throw new common_1.BadRequestException('Status must be a string or number');
                }
                const statusStr = String(status).trim();
                const validStatuses = Object.values(table_entity_1.TableStatus);
                if (!validStatuses.includes(statusStr)) {
                    throw new common_1.BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
                }
            }
            if (tableType !== undefined && tableType !== null) {
                if (typeof tableType !== 'string' && typeof tableType !== 'number') {
                    throw new common_1.BadRequestException('Table type must be a string or number');
                }
                const tableTypeStr = String(tableType).trim();
                const validTableTypes = Object.values(table_entity_1.TableType);
                if (!validTableTypes.includes(tableTypeStr)) {
                    throw new common_1.BadRequestException(`Invalid table type. Must be one of: ${validTableTypes.join(', ')}`);
                }
            }
            let tables = [];
            try {
                tables = await this.waitlistSeatingService.getTables(clubId, status ? (typeof status === 'string' ? status.trim() : status) : undefined, tableType ? (typeof tableType === 'string' ? tableType.trim() : tableType) : undefined);
            }
            catch (dbError) {
                console.error('Database error fetching tables:', dbError);
                throw new common_1.BadRequestException('Unable to fetch tables. Please try again.');
            }
            if (!Array.isArray(tables)) {
                console.error('Tables query returned non-array result');
                tables = [];
            }
            const validTables = tables.map(table => {
                try {
                    return {
                        id: table.id,
                        tableNumber: table.tableNumber || 0,
                        tableType: table.tableType || 'Unknown',
                        maxSeats: table.maxSeats || 0,
                        currentSeats: table.currentSeats || 0,
                        availableSeats: (table.maxSeats || 0) - (table.currentSeats || 0),
                        status: table.status || table_entity_1.TableStatus.AVAILABLE,
                        minBuyIn: table.minBuyIn ? Number(table.minBuyIn) : null,
                        maxBuyIn: table.maxBuyIn ? Number(table.maxBuyIn) : null,
                        notes: table.notes || null,
                        createdAt: table.createdAt,
                        updatedAt: table.updatedAt
                    };
                }
                catch (mapError) {
                    console.error('Error mapping table:', table.id, mapError);
                    return null;
                }
            }).filter(t => t !== null);
            return validTables;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get tables: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getTable(tenantId, headerClubId, clubId, tableId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(tableId)) {
                throw new common_1.BadRequestException('Invalid table ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view tables for your assigned club');
            }
            let table;
            try {
                table = await this.waitlistSeatingService.getTable(clubId, tableId);
            }
            catch (dbError) {
                console.error('Database error fetching table:', dbError);
                throw new common_1.BadRequestException('Unable to fetch table. Please try again.');
            }
            if (!table) {
                throw new common_1.NotFoundException('Table not found');
            }
            return table;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get table: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateTable(tenantId, clubId, tableId, dto) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            const updateData = { ...dto };
            if (dto.reservedUntil) {
                updateData.reservedUntil = new Date(dto.reservedUntil);
            }
            return this.waitlistSeatingService.updateTable(clubId, tableId, updateData);
        }
        catch (e) {
            throw e;
        }
    }
    async deleteTable(tenantId, headerClubId, clubId, tableId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(tableId)) {
                throw new common_1.BadRequestException('Invalid table ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only delete tables for your assigned club');
            }
            let table;
            try {
                table = await this.waitlistSeatingService.getTable(clubId, tableId);
            }
            catch (dbError) {
                console.error('Database error fetching table:', dbError);
                throw new common_1.BadRequestException('Unable to verify table. Please try again.');
            }
            if (!table) {
                throw new common_1.NotFoundException('Table not found');
            }
            if (table.currentSeats && table.currentSeats > 0) {
                throw new common_1.ConflictException('Cannot delete table with active players. Please unseat all players first.');
            }
            try {
                await this.waitlistSeatingService.deleteTable(clubId, tableId);
            }
            catch (deleteError) {
                console.error('Database error deleting table:', deleteError);
                if (deleteError instanceof common_1.NotFoundException || deleteError instanceof common_1.ConflictException) {
                    throw deleteError;
                }
                throw new common_1.BadRequestException('Unable to delete table. Please try again.');
            }
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to delete table: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getRevenueAnalytics(tenantId, headerClubId, clubId, startDate, endDate) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view analytics for your assigned club');
            }
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            if (start && isNaN(start.getTime())) {
                throw new common_1.BadRequestException('Invalid startDate format');
            }
            if (end && isNaN(end.getTime())) {
                throw new common_1.BadRequestException('Invalid endDate format');
            }
            if (start && end && start > end) {
                throw new common_1.BadRequestException('startDate cannot be after endDate');
            }
            const now = new Date();
            if (start && start > now) {
                throw new common_1.BadRequestException('startDate cannot be in the future');
            }
            if (end && end > now) {
                throw new common_1.BadRequestException('endDate cannot be in the future');
            }
            const maxDateRange = 365 * 24 * 60 * 60 * 1000;
            if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
                throw new common_1.BadRequestException('Date range cannot exceed 1 year');
            }
            let analytics;
            try {
                analytics = await this.analyticsService.getRevenueAnalytics(clubId, start, end);
            }
            catch (dbError) {
                console.error('Database error fetching revenue analytics:', dbError);
                throw new common_1.BadRequestException('Unable to fetch revenue analytics. Please try again.');
            }
            if (!analytics || typeof analytics !== 'object') {
                throw new common_1.BadRequestException('Invalid analytics response');
            }
            return analytics;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get revenue analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getPlayerAnalytics(tenantId, headerClubId, clubId, startDate, endDate) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view analytics for your assigned club');
            }
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            if (start && isNaN(start.getTime())) {
                throw new common_1.BadRequestException('Invalid startDate format');
            }
            if (end && isNaN(end.getTime())) {
                throw new common_1.BadRequestException('Invalid endDate format');
            }
            if (start && end && start > end) {
                throw new common_1.BadRequestException('startDate cannot be after endDate');
            }
            const now = new Date();
            if (start && start > now) {
                throw new common_1.BadRequestException('startDate cannot be in the future');
            }
            if (end && end > now) {
                throw new common_1.BadRequestException('endDate cannot be in the future');
            }
            const maxDateRange = 365 * 24 * 60 * 60 * 1000;
            if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
                throw new common_1.BadRequestException('Date range cannot exceed 1 year');
            }
            let analytics;
            try {
                analytics = await this.analyticsService.getPlayerAnalytics(clubId, start, end);
            }
            catch (dbError) {
                console.error('Database error fetching player analytics:', dbError);
                throw new common_1.BadRequestException('Unable to fetch player analytics. Please try again.');
            }
            if (!analytics || typeof analytics !== 'object') {
                throw new common_1.BadRequestException('Invalid analytics response');
            }
            return analytics;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get player analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getStaffAnalytics(tenantId, headerClubId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view analytics for your assigned club');
            }
            let analytics;
            try {
                analytics = await this.analyticsService.getStaffAnalytics(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching staff analytics:', dbError);
                throw new common_1.BadRequestException('Unable to fetch staff analytics. Please try again.');
            }
            if (!analytics || typeof analytics !== 'object') {
                throw new common_1.BadRequestException('Invalid analytics response');
            }
            return analytics;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get staff analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getTableAnalytics(tenantId, headerClubId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view analytics for your assigned club');
            }
            let analytics;
            try {
                analytics = await this.analyticsService.getTableAnalytics(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching table analytics:', dbError);
                throw new common_1.BadRequestException('Unable to fetch table analytics. Please try again.');
            }
            if (!analytics || typeof analytics !== 'object') {
                throw new common_1.BadRequestException('Invalid analytics response');
            }
            return analytics;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get table analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getWaitlistAnalytics(tenantId, headerClubId, clubId, startDate, endDate) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view analytics for your assigned club');
            }
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            if (start && isNaN(start.getTime())) {
                throw new common_1.BadRequestException('Invalid startDate format');
            }
            if (end && isNaN(end.getTime())) {
                throw new common_1.BadRequestException('Invalid endDate format');
            }
            if (start && end && start > end) {
                throw new common_1.BadRequestException('startDate cannot be after endDate');
            }
            const now = new Date();
            if (start && start > now) {
                throw new common_1.BadRequestException('startDate cannot be in the future');
            }
            if (end && end > now) {
                throw new common_1.BadRequestException('endDate cannot be in the future');
            }
            const maxDateRange = 365 * 24 * 60 * 60 * 1000;
            if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
                throw new common_1.BadRequestException('Date range cannot exceed 1 year');
            }
            let analytics;
            try {
                analytics = await this.analyticsService.getWaitlistAnalytics(clubId, start, end);
            }
            catch (dbError) {
                console.error('Database error fetching waitlist analytics:', dbError);
                throw new common_1.BadRequestException('Unable to fetch waitlist analytics. Please try again.');
            }
            if (!analytics || typeof analytics !== 'object') {
                throw new common_1.BadRequestException('Invalid analytics response');
            }
            return analytics;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get waitlist analytics: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getDashboardStats(tenantId, headerClubId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for club-scoped roles');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view analytics for your assigned club');
            }
            let analytics;
            try {
                analytics = await this.analyticsService.getDashboardStats(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching dashboard stats:', dbError);
                throw new common_1.BadRequestException('Unable to fetch dashboard stats. Please try again.');
            }
            if (!analytics || typeof analytics !== 'object') {
                throw new common_1.BadRequestException('Invalid analytics response');
            }
            if (!analytics.clubId || !analytics.clubName) {
                throw new common_1.BadRequestException('Incomplete analytics response');
            }
            return analytics;
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get dashboard stats: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getAllSettings(tenantId, clubId) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            return this.clubSettingsService.getAllSettings(clubId);
        }
        catch (e) {
            throw e;
        }
    }
    async getSetting(tenantId, clubId, key) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            if (!key || !key.trim()) {
                throw new common_1.BadRequestException('Setting key is required');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            const value = await this.clubSettingsService.getSetting(clubId, key);
            if (value === null) {
                throw new common_1.NotFoundException(`Setting '${key}' not found`);
            }
            return { key, value };
        }
        catch (e) {
            throw e;
        }
    }
    async setSetting(tenantId, clubId, key, dto) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            if (!key || !key.trim()) {
                throw new common_1.BadRequestException('Setting key is required');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            return this.clubSettingsService.setSetting(clubId, key, dto.value);
        }
        catch (e) {
            throw e;
        }
    }
    async deleteSetting(tenantId, clubId, key) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            if (!key || !key.trim()) {
                throw new common_1.BadRequestException('Setting key is required');
            }
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            await this.clubSettingsService.setSetting(clubId, key, '');
        }
        catch (e) {
            throw e;
        }
    }
    async getAuditLogs(tenantId, headerClubId, clubId, limit, action, entityType, startDate, endDate) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for ADMIN role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view audit logs for your assigned club');
            }
            const limitNum = limit ? parseInt(limit, 10) : 100;
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
                throw new common_1.BadRequestException('Limit must be between 1 and 1000');
            }
            if (action !== undefined && action !== null) {
                if (typeof action !== 'string' || !action.trim()) {
                    throw new common_1.BadRequestException('Action filter must be a non-empty string if provided');
                }
                if (action.trim().length > 50) {
                    throw new common_1.BadRequestException('Action filter cannot exceed 50 characters');
                }
            }
            if (entityType !== undefined && entityType !== null) {
                if (typeof entityType !== 'string' || !entityType.trim()) {
                    throw new common_1.BadRequestException('Entity type filter must be a non-empty string if provided');
                }
                if (entityType.trim().length > 50) {
                    throw new common_1.BadRequestException('Entity type filter cannot exceed 50 characters');
                }
            }
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            if (start && isNaN(start.getTime())) {
                throw new common_1.BadRequestException('Invalid startDate format');
            }
            if (end && isNaN(end.getTime())) {
                throw new common_1.BadRequestException('Invalid endDate format');
            }
            if (start && end && start > end) {
                throw new common_1.BadRequestException('startDate cannot be after endDate');
            }
            const now = new Date();
            if (start && start > now) {
                throw new common_1.BadRequestException('startDate cannot be in the future');
            }
            if (end && end > now) {
                throw new common_1.BadRequestException('endDate cannot be in the future');
            }
            const maxDateRange = 365 * 24 * 60 * 60 * 1000;
            if (start && end && (end.getTime() - start.getTime()) > maxDateRange) {
                throw new common_1.BadRequestException('Date range cannot exceed 1 year');
            }
            let logs = [];
            try {
                logs = await this.auditLogsService.findAll(clubId, limitNum);
            }
            catch (dbError) {
                console.error('Database error fetching audit logs:', dbError);
                throw new common_1.BadRequestException('Unable to fetch audit logs. Please try again.');
            }
            if (!Array.isArray(logs)) {
                console.error('Audit logs query returned non-array result');
                logs = [];
            }
            if (action && action.trim()) {
                logs = logs.filter(log => log && log.action === action.trim());
            }
            if (entityType && entityType.trim()) {
                logs = logs.filter(log => log && log.entityType === entityType.trim());
            }
            if (start || end) {
                const startTime = start ? start.getTime() : 0;
                const endTime = end ? end.getTime() : Date.now();
                logs = logs.filter(log => {
                    if (!log || !log.createdAt)
                        return false;
                    const logTime = new Date(log.createdAt).getTime();
                    if (isNaN(logTime))
                        return false;
                    return logTime >= startTime && logTime <= endTime;
                });
            }
            const validLogs = logs.map(log => {
                try {
                    return {
                        id: log.id,
                        action: log.action || 'Unknown',
                        entityType: log.entityType || 'Unknown',
                        entityId: log.entityId || null,
                        userId: log.userId || null,
                        userName: log.userName || null,
                        details: log.details || null,
                        ipAddress: log.ipAddress || null,
                        createdAt: log.createdAt,
                        updatedAt: log.updatedAt
                    };
                }
                catch (mapError) {
                    console.error('Error mapping audit log:', log.id, mapError);
                    return null;
                }
            }).filter(log => log !== null);
            return {
                logs: validLogs,
                total: validLogs.length,
                limit: limitNum,
                clubId: clubId
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get audit logs: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async exportAuditLogs(tenantId, clubId, startDate, endDate, format) {
        try {
            if (!tenantId)
                throw new common_1.BadRequestException('x-tenant-id header required');
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;
            if (start && isNaN(start.getTime())) {
                throw new common_1.BadRequestException('Invalid startDate format');
            }
            if (end && isNaN(end.getTime())) {
                throw new common_1.BadRequestException('Invalid endDate format');
            }
            if (start && end && start > end) {
                throw new common_1.BadRequestException('startDate cannot be after endDate');
            }
            const logs = await this.auditLogsService.findAll(clubId, 10000);
            let filteredLogs = logs;
            if (start || end) {
                filteredLogs = logs.filter(log => {
                    const logDate = new Date(log.createdAt);
                    if (start && logDate < start)
                        return false;
                    if (end && logDate > end)
                        return false;
                    return true;
                });
            }
            const exportFormat = (format === null || format === void 0 ? void 0 : format.toLowerCase()) || 'json';
            if (exportFormat === 'csv') {
                const headers = ['Date', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'User Email', 'Description'];
                const rows = filteredLogs.map(log => [
                    log.createdAt.toISOString(),
                    log.action,
                    log.entityType,
                    log.entityId || '',
                    log.userId || '',
                    log.userEmail || '',
                    log.description || ''
                ]);
                const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
                return { format: 'csv', data: csv, count: filteredLogs.length };
            }
            else {
                return { format: 'json', data: filteredLogs, count: filteredLogs.length };
            }
        }
        catch (e) {
            throw e;
        }
    }
    async createAffiliate(clubId, dto, tenantId, headerClubId) {
        var _a;
        try {
            if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
                throw new common_1.BadRequestException('x-tenant-id header is required for Super Admin');
            }
            if (tenantId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
                throw new common_1.BadRequestException('Email is required and must be a non-empty string');
            }
            if (dto.email.trim().length > 200) {
                throw new common_1.BadRequestException('Email cannot exceed 200 characters');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(dto.email.trim())) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            if (dto.displayName !== undefined && dto.displayName !== null) {
                if (typeof dto.displayName !== 'string') {
                    throw new common_1.BadRequestException('Display name must be a string');
                }
                if (dto.displayName.trim().length > 200) {
                    throw new common_1.BadRequestException('Display name cannot exceed 200 characters');
                }
            }
            if (dto.commissionRate !== undefined && dto.commissionRate !== null) {
                if (typeof dto.commissionRate !== 'number') {
                    throw new common_1.BadRequestException('Commission rate must be a number');
                }
                if (isNaN(dto.commissionRate)) {
                    throw new common_1.BadRequestException('Commission rate must be a valid number');
                }
                if (dto.commissionRate < 0) {
                    throw new common_1.BadRequestException('Commission rate cannot be negative');
                }
                if (dto.commissionRate > 100) {
                    throw new common_1.BadRequestException('Commission rate cannot exceed 100%');
                }
                const decimalPlaces = (dto.commissionRate.toString().split('.')[1] || '').length;
                if (decimalPlaces > 2) {
                    throw new common_1.BadRequestException('Commission rate can have maximum 2 decimal places');
                }
            }
            if (dto.code !== undefined && dto.code !== null) {
                if (typeof dto.code !== 'string') {
                    throw new common_1.BadRequestException('Affiliate code must be a string');
                }
                const trimmedCode = dto.code.trim();
                if (trimmedCode.length < 3) {
                    throw new common_1.BadRequestException('Affiliate code must be at least 3 characters');
                }
                if (trimmedCode.length > 20) {
                    throw new common_1.BadRequestException('Affiliate code cannot exceed 20 characters');
                }
                if (!/^[A-Z0-9]+$/.test(trimmedCode.toUpperCase())) {
                    throw new common_1.BadRequestException('Affiliate code can only contain uppercase letters and numbers');
                }
                const reservedCodes = ['ADMIN', 'SUPER', 'MASTER', 'SYSTEM', 'NULL', 'TEST'];
                if (reservedCodes.includes(trimmedCode.toUpperCase())) {
                    throw new common_1.BadRequestException('This affiliate code is reserved and cannot be used');
                }
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only create affiliates for your assigned club');
            }
            const affiliate = await this.affiliatesService.createAffiliate(clubId, dto.email.trim(), (_a = dto.displayName) === null || _a === void 0 ? void 0 : _a.trim(), dto.code, dto.commissionRate || 5.0);
            return {
                id: affiliate.id,
                code: affiliate.code,
                name: affiliate.name,
                email: affiliate.user.email,
                commissionRate: affiliate.commissionRate,
                status: affiliate.status,
                createdAt: affiliate.createdAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to create affiliate'));
        }
    }
    async getAffiliates(clubId, tenantId, headerClubId) {
        try {
            if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
                throw new common_1.BadRequestException('x-tenant-id header is required for Super Admin');
            }
            if (tenantId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only view affiliates for your assigned club');
            }
            const affiliates = await this.affiliatesService.findByClub(clubId);
            if (!affiliates || !Array.isArray(affiliates)) {
                return [];
            }
            return affiliates.map(a => {
                var _a;
                return ({
                    id: a.id,
                    code: a.code,
                    name: a.name,
                    email: ((_a = a.user) === null || _a === void 0 ? void 0 : _a.email) || null,
                    commissionRate: a.commissionRate,
                    status: a.status,
                    totalReferrals: a.totalReferrals,
                    totalCommission: a.totalCommission,
                    createdAt: a.createdAt
                });
            });
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliates'));
        }
    }
    async getAffiliate(clubId, affiliateId, tenantId, headerClubId, userId) {
        var _a;
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(affiliateId)) {
                throw new common_1.BadRequestException('Invalid affiliate ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (userId !== undefined && userId !== null) {
                if (typeof userId !== 'string' || !userId.trim()) {
                    throw new common_1.BadRequestException('x-user-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(userId.trim())) {
                    throw new common_1.BadRequestException('Invalid user ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for AFFILIATE role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view affiliates for your assigned club');
            }
            let affiliate;
            try {
                affiliate = await this.affiliatesService.findByUserAndClub(userId || '', clubId);
                if (!affiliate) {
                    affiliate = await this.affiliatesRepo.findOne({
                        where: { id: affiliateId, club: { id: clubId } },
                        relations: ['club', 'user', 'players']
                    });
                }
            }
            catch (dbError) {
                console.error('Database error fetching affiliate:', dbError);
                if (dbError instanceof common_1.NotFoundException) {
                    throw dbError;
                }
                throw new common_1.BadRequestException('Unable to fetch affiliate. Please try again.');
            }
            if (!affiliate) {
                throw new common_1.NotFoundException('Affiliate not found');
            }
            if (affiliate.club && affiliate.club.id !== clubId) {
                throw new common_1.ForbiddenException('Affiliate does not belong to this club');
            }
            if (userId && affiliate.user && affiliate.user.id !== userId.trim()) {
                throw new common_1.ForbiddenException('You can only view your own affiliate details');
            }
            if (!affiliate.id || !affiliate.code) {
                throw new common_1.BadRequestException('Affiliate data is incomplete or corrupted');
            }
            if (!affiliate.status || (affiliate.status !== 'Active' && affiliate.status !== 'Inactive')) {
                console.warn(`Affiliate ${affiliateId} has invalid status: ${affiliate.status}`);
            }
            if (affiliate.commissionRate === null || affiliate.commissionRate === undefined || isNaN(Number(affiliate.commissionRate))) {
                console.warn(`Affiliate ${affiliateId} has invalid commission rate: ${affiliate.commissionRate}`);
            }
            if (affiliate.user && !affiliate.user.id) {
                console.warn(`Affiliate ${affiliateId} has invalid user relationship`);
            }
            if (affiliate.id !== affiliateId) {
                throw new common_1.BadRequestException('Affiliate ID mismatch');
            }
            const totalCommission = Number(affiliate.totalCommission);
            const commissionRate = Number(affiliate.commissionRate);
            if (isNaN(totalCommission) || totalCommission < 0) {
                console.warn(`Affiliate ${affiliateId} has invalid totalCommission: ${affiliate.totalCommission}`);
            }
            if (isNaN(commissionRate) || commissionRate < 0 || commissionRate > 100) {
                console.warn(`Affiliate ${affiliateId} has invalid commissionRate: ${affiliate.commissionRate}`);
            }
            return {
                id: affiliate.id,
                code: affiliate.code,
                name: affiliate.name || null,
                email: ((_a = affiliate.user) === null || _a === void 0 ? void 0 : _a.email) || null,
                commissionRate: isNaN(commissionRate) ? 0 : commissionRate,
                status: affiliate.status || 'Active',
                totalReferrals: affiliate.totalReferrals || 0,
                totalCommission: isNaN(totalCommission) ? 0 : totalCommission,
                createdAt: affiliate.createdAt,
                updatedAt: affiliate.updatedAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to get affiliate: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async updateAffiliate(clubId, affiliateId, tenantId, headerClubId, userId, dto) {
        var _a;
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(affiliateId)) {
                throw new common_1.BadRequestException('Invalid affiliate ID format');
            }
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            if (!dto.name && dto.commissionRate === undefined) {
                throw new common_1.BadRequestException('At least one field (name or commissionRate) must be provided for update');
            }
            if (dto.name !== undefined && dto.name !== null) {
                if (typeof dto.name !== 'string' || !dto.name.trim()) {
                    throw new common_1.BadRequestException('Name must be a non-empty string if provided');
                }
                if (dto.name.trim().length < 2 || dto.name.trim().length > 200) {
                    throw new common_1.BadRequestException('Name must be between 2 and 200 characters');
                }
            }
            if (dto.commissionRate !== undefined && dto.commissionRate !== null) {
                const rate = typeof dto.commissionRate === 'string' ? parseFloat(dto.commissionRate) : Number(dto.commissionRate);
                if (isNaN(rate) || !isFinite(rate)) {
                    throw new common_1.BadRequestException('Commission rate must be a valid number');
                }
                if (rate < 0) {
                    throw new common_1.BadRequestException('Commission rate cannot be negative');
                }
                if (rate > 100) {
                    throw new common_1.BadRequestException('Commission rate cannot exceed 100%');
                }
                const decimalPlaces = (rate.toString().split('.')[1] || '').length;
                if (decimalPlaces > 2) {
                    throw new common_1.BadRequestException('Commission rate cannot have more than 2 decimal places');
                }
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (userId !== undefined && userId !== null) {
                if (typeof userId !== 'string' || !userId.trim()) {
                    throw new common_1.BadRequestException('x-user-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(userId.trim())) {
                    throw new common_1.BadRequestException('Invalid user ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for AFFILIATE role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only update affiliates for your assigned club');
            }
            let affiliate;
            try {
                affiliate = await this.affiliatesService.findByUserAndClub(userId || '', clubId);
                if (!affiliate) {
                    affiliate = await this.affiliatesRepo.findOne({
                        where: { id: affiliateId, club: { id: clubId } },
                        relations: ['club', 'user']
                    });
                }
            }
            catch (dbError) {
                console.error('Database error fetching affiliate:', dbError);
                if (dbError instanceof common_1.NotFoundException) {
                    throw dbError;
                }
                throw new common_1.BadRequestException('Unable to fetch affiliate. Please try again.');
            }
            if (!affiliate) {
                throw new common_1.NotFoundException('Affiliate not found');
            }
            if (affiliate.club && affiliate.club.id !== clubId) {
                throw new common_1.ForbiddenException('Affiliate does not belong to this club');
            }
            if (userId && affiliate.user && affiliate.user.id !== userId.trim()) {
                throw new common_1.ForbiddenException('You can only update your own affiliate details');
            }
            if (affiliate.id !== affiliateId) {
                throw new common_1.BadRequestException('Affiliate ID mismatch');
            }
            if (!affiliate.id || !affiliate.code) {
                throw new common_1.BadRequestException('Affiliate data is incomplete or corrupted');
            }
            if (affiliate.status && affiliate.status !== 'Active' && !tenantId) {
                throw new common_1.ForbiddenException('Cannot update inactive affiliate. Please contact administrator.');
            }
            if (userId && !tenantId && dto.commissionRate !== undefined) {
                throw new common_1.ForbiddenException('You do not have permission to update commission rate');
            }
            if (dto.name && dto.name.trim() && dto.name.trim() !== affiliate.name) {
                const existingAffiliate = await this.affiliatesRepo.findOne({
                    where: {
                        club: { id: clubId },
                        name: dto.name.trim()
                    }
                });
                if (existingAffiliate && existingAffiliate.id !== affiliateId) {
                    throw new common_1.ConflictException('An affiliate with this name already exists in this club');
                }
            }
            const hasNameChange = dto.name !== undefined && dto.name !== null && dto.name.trim() !== affiliate.name;
            const hasRateChange = dto.commissionRate !== undefined && dto.commissionRate !== null &&
                (!userId || tenantId) &&
                Number(dto.commissionRate) !== Number(affiliate.commissionRate);
            if (!hasNameChange && !hasRateChange) {
                throw new common_1.BadRequestException('No changes detected. Please provide different values to update.');
            }
            if (dto.name !== undefined && dto.name !== null) {
                affiliate.name = dto.name.trim();
            }
            if (dto.commissionRate !== undefined && dto.commissionRate !== null && (!userId || tenantId)) {
                const newRate = typeof dto.commissionRate === 'string' ? parseFloat(dto.commissionRate) : Number(dto.commissionRate);
                affiliate.commissionRate = Math.round(newRate * 100) / 100;
            }
            let updatedAffiliate;
            try {
                updatedAffiliate = await this.affiliatesRepo.save(affiliate);
            }
            catch (dbError) {
                console.error('Database error updating affiliate:', dbError);
                if (dbError instanceof Error && (dbError.message.includes('unique') || dbError.message.includes('duplicate'))) {
                    throw new common_1.ConflictException('An affiliate with this information already exists');
                }
                throw new common_1.BadRequestException('Unable to update affiliate. Please try again.');
            }
            if (!updatedAffiliate) {
                throw new common_1.NotFoundException('Affiliate not found or update failed');
            }
            if (!updatedAffiliate.id || !updatedAffiliate.code) {
                throw new common_1.BadRequestException('Updated affiliate data is incomplete or corrupted');
            }
            const finalCommissionRate = Number(updatedAffiliate.commissionRate);
            const finalTotalCommission = Number(updatedAffiliate.totalCommission);
            if (isNaN(finalCommissionRate) || finalCommissionRate < 0 || finalCommissionRate > 100) {
                console.warn(`Updated affiliate ${affiliateId} has invalid commissionRate: ${updatedAffiliate.commissionRate}`);
            }
            if (isNaN(finalTotalCommission) || finalTotalCommission < 0) {
                console.warn(`Updated affiliate ${affiliateId} has invalid totalCommission: ${updatedAffiliate.totalCommission}`);
            }
            return {
                id: updatedAffiliate.id,
                code: updatedAffiliate.code,
                name: updatedAffiliate.name || null,
                email: ((_a = updatedAffiliate.user) === null || _a === void 0 ? void 0 : _a.email) || null,
                commissionRate: isNaN(finalCommissionRate) ? 0 : finalCommissionRate,
                status: updatedAffiliate.status || 'Active',
                totalReferrals: updatedAffiliate.totalReferrals || 0,
                totalCommission: isNaN(finalTotalCommission) ? 0 : finalTotalCommission,
                createdAt: updatedAffiliate.createdAt,
                updatedAt: updatedAffiliate.updatedAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException(`Failed to update affiliate: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }
    async getAffiliateStats(clubId, affiliateId, tenantId, headerClubId, userId) {
        try {
            if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
                throw new common_1.BadRequestException('x-tenant-id header is required for Super Admin');
            }
            if (tenantId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (userId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(userId.trim())) {
                    throw new common_1.BadRequestException('Invalid user ID format in header');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(affiliateId)) {
                throw new common_1.BadRequestException('Invalid affiliate ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only view affiliate stats for your assigned club');
            }
            if (userId && headerClubId && !tenantId) {
                if (!userId.trim()) {
                    throw new common_1.BadRequestException('x-user-id header is required for affiliate users');
                }
                const affiliate = await this.affiliatesService.findByUserAndClub(userId.trim(), clubId);
                if (!affiliate) {
                    throw new common_1.NotFoundException('Affiliate not found for this user');
                }
                if (affiliate.id !== affiliateId) {
                    throw new common_1.ForbiddenException('You can only view your own affiliate statistics');
                }
            }
            return await this.affiliatesService.getAffiliateStats(affiliateId);
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliate stats'));
        }
    }
    async createPlayer(clubId, dto, tenantId) {
        var _a, _b, _c, _d, _e;
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (!dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
                throw new common_1.BadRequestException('Name is required and must be a non-empty string');
            }
            const trimmedName = dto.name.trim();
            if (trimmedName.length < 2) {
                throw new common_1.BadRequestException('Name must be at least 2 characters long');
            }
            if (trimmedName.length > 200) {
                throw new common_1.BadRequestException('Name cannot exceed 200 characters');
            }
            if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
                throw new common_1.BadRequestException('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
            }
            if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
                throw new common_1.BadRequestException('Email is required and must be a non-empty string');
            }
            const trimmedEmail = dto.email.trim().toLowerCase();
            if (trimmedEmail.length > 200) {
                throw new common_1.BadRequestException('Email cannot exceed 200 characters');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(trimmedEmail)) {
                throw new common_1.BadRequestException('Invalid email format');
            }
            const emailParts = trimmedEmail.split('@');
            if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
                throw new common_1.BadRequestException('Invalid email domain');
            }
            if (dto.phoneNumber !== undefined && dto.phoneNumber !== null) {
                if (typeof dto.phoneNumber !== 'string') {
                    throw new common_1.BadRequestException('Phone number must be a string');
                }
                const trimmedPhone = dto.phoneNumber.trim();
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
            if (dto.playerId !== undefined && dto.playerId !== null) {
                if (typeof dto.playerId !== 'string') {
                    throw new common_1.BadRequestException('Player ID must be a string');
                }
                const trimmedPlayerId = dto.playerId.trim();
                if (trimmedPlayerId.length > 100) {
                    throw new common_1.BadRequestException('Player ID cannot exceed 100 characters');
                }
                if (trimmedPlayerId.length < 1) {
                    throw new common_1.BadRequestException('Player ID cannot be empty if provided');
                }
            }
            if (dto.affiliateCode !== undefined && dto.affiliateCode !== null) {
                if (typeof dto.affiliateCode !== 'string') {
                    throw new common_1.BadRequestException('Affiliate code must be a string');
                }
                const trimmedCode = dto.affiliateCode.trim().toUpperCase();
                if (trimmedCode.length < 3) {
                    throw new common_1.BadRequestException('Affiliate code must be at least 3 characters');
                }
                if (trimmedCode.length > 20) {
                    throw new common_1.BadRequestException('Affiliate code cannot exceed 20 characters');
                }
                if (!/^[A-Z0-9]+$/.test(trimmedCode)) {
                    throw new common_1.BadRequestException('Affiliate code can only contain uppercase letters and numbers');
                }
            }
            if (dto.notes !== undefined && dto.notes !== null) {
                if (typeof dto.notes !== 'string') {
                    throw new common_1.BadRequestException('Notes must be a string');
                }
                if (dto.notes.trim().length > 500) {
                    throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
                }
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            const player = await this.affiliatesService.createPlayer(clubId, trimmedName, trimmedEmail, (_a = dto.phoneNumber) === null || _a === void 0 ? void 0 : _a.trim(), (_b = dto.playerId) === null || _b === void 0 ? void 0 : _b.trim(), (_c = dto.affiliateCode) === null || _c === void 0 ? void 0 : _c.trim().toUpperCase(), (_d = dto.notes) === null || _d === void 0 ? void 0 : _d.trim());
            return {
                id: player.id,
                name: player.name,
                email: player.email,
                phoneNumber: player.phoneNumber,
                playerId: player.playerId,
                affiliateCode: ((_e = player.affiliate) === null || _e === void 0 ? void 0 : _e.code) || null,
                status: player.status,
                createdAt: player.createdAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to create player'));
        }
    }
    async getAffiliatePlayers(clubId, affiliateId, tenantId, headerClubId, userId) {
        try {
            if (!headerClubId && (!tenantId || typeof tenantId !== 'string' || !tenantId.trim())) {
                throw new common_1.BadRequestException('x-tenant-id header is required for Super Admin');
            }
            if (tenantId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (userId) {
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(userId.trim())) {
                    throw new common_1.BadRequestException('Invalid user ID format in header');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(affiliateId)) {
                throw new common_1.BadRequestException('Invalid affiliate ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && headerClubId !== clubId) {
                throw new common_1.ForbiddenException('You can only view players for your assigned club');
            }
            if (userId && headerClubId && !tenantId) {
                if (!userId.trim()) {
                    throw new common_1.BadRequestException('x-user-id header is required for affiliate users');
                }
                const affiliate = await this.affiliatesService.findByUserAndClub(userId.trim(), clubId);
                if (!affiliate) {
                    throw new common_1.NotFoundException('Affiliate not found for this user');
                }
                if (affiliate.id !== affiliateId) {
                    throw new common_1.ForbiddenException('You can only view your own players');
                }
            }
            const players = await this.affiliatesService.getAffiliatePlayers(affiliateId);
            return players.map(p => ({
                id: p.id,
                name: p.name,
                email: p.email,
                phoneNumber: p.phoneNumber,
                playerId: p.playerId,
                totalSpent: p.totalSpent,
                totalCommission: p.totalCommission,
                status: p.status,
                createdAt: p.createdAt
            }));
        }
        catch (e) {
            if (e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get affiliate players'));
        }
    }
    async getPlayers(clubId, tenantId, headerClubId, status, page, limit, search) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for CASHIER role');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view players for your assigned club');
            }
            const validStatuses = ['Active', 'Inactive', 'Suspended'];
            if (status && typeof status === 'string' && status.trim()) {
                if (!validStatuses.includes(status.trim())) {
                    throw new common_1.BadRequestException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
                }
            }
            const pageNum = page ? parseInt(page, 10) : 1;
            const limitNum = limit ? parseInt(limit, 10) : 10;
            if (isNaN(pageNum) || pageNum < 1) {
                throw new common_1.BadRequestException('Page must be 1 or greater');
            }
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                throw new common_1.BadRequestException('Limit must be between 1 and 100');
            }
            if (pageNum > 10000) {
                throw new common_1.BadRequestException('Page number cannot exceed 10000');
            }
            const offsetNum = (pageNum - 1) * limitNum;
            let searchTerm = null;
            if (search !== undefined && search !== null) {
                if (typeof search !== 'string') {
                    throw new common_1.BadRequestException('Search must be a string');
                }
                searchTerm = search.trim();
                if (searchTerm.length > 200) {
                    throw new common_1.BadRequestException('Search term cannot exceed 200 characters');
                }
                if (searchTerm.length === 0) {
                    searchTerm = null;
                }
            }
            const where = { club: { id: clubId } };
            if (status && status.trim()) {
                where.status = status.trim();
            }
            let players = [];
            let total = 0;
            try {
                if (searchTerm) {
                    const queryBuilder = this.playersRepo.createQueryBuilder('player')
                        .leftJoinAndSelect('player.affiliate', 'affiliate')
                        .leftJoinAndSelect('player.club', 'club')
                        .where('player.club_id = :clubId', { clubId });
                    if (status && status.trim()) {
                        queryBuilder.andWhere('player.status = :status', { status: status.trim() });
                    }
                    queryBuilder.andWhere('(LOWER(player.name) LIKE LOWER(:search) OR ' +
                        'LOWER(player.email) LIKE LOWER(:search) OR ' +
                        'LOWER(player.phone_number) LIKE LOWER(:search) OR ' +
                        'LOWER(player.player_id) LIKE LOWER(:search))', { search: `%${searchTerm}%` });
                    queryBuilder.orderBy('player.created_at', 'DESC');
                    queryBuilder.skip(offsetNum);
                    queryBuilder.take(limitNum);
                    [players, total] = await queryBuilder.getManyAndCount();
                }
                else {
                    [players, total] = await this.playersRepo.findAndCount({
                        where,
                        relations: ['affiliate', 'club'],
                        order: { createdAt: 'DESC' },
                        take: limitNum,
                        skip: offsetNum
                    });
                }
            }
            catch (dbError) {
                console.error('Database error fetching players:', dbError);
                throw new common_1.BadRequestException('Unable to fetch players. Please try again.');
            }
            const validPlayers = players.filter(p => p && p.id && p.name && p.email);
            if (validPlayers.length !== players.length) {
                console.warn('Some players have incomplete data');
            }
            const totalPages = total > 0 ? Math.ceil(total / limitNum) : 0;
            const hasNextPage = pageNum < totalPages;
            const hasPrevPage = pageNum > 1;
            if (pageNum > totalPages && totalPages > 0) {
                throw new common_1.BadRequestException(`Page ${pageNum} exceeds total pages (${totalPages})`);
            }
            return {
                players: validPlayers.map(p => {
                    try {
                        return {
                            id: p.id,
                            name: p.name || 'Unknown',
                            email: p.email || '',
                            phoneNumber: p.phoneNumber || null,
                            playerId: p.playerId || null,
                            status: p.status || 'Active',
                            totalSpent: Number(p.totalSpent) || 0,
                            totalCommission: Number(p.totalCommission) || 0,
                            affiliateCode: p.affiliate ? p.affiliate.code : null,
                            notes: p.notes || null,
                            createdAt: p.createdAt,
                            updatedAt: p.updatedAt
                        };
                    }
                    catch (mapError) {
                        console.error('Error mapping player:', p.id, mapError);
                        return null;
                    }
                }).filter(p => p !== null),
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    totalPages,
                    hasNextPage,
                    hasPrevPage
                },
                search: searchTerm || null
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get players'));
        }
    }
    async getPlayer(clubId, playerId, tenantId, headerClubId, userId) {
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view players for your assigned club');
            }
            let player = null;
            try {
                player = await this.playersRepo.findOne({
                    where: { id: playerId, club: { id: clubId } },
                    relations: ['affiliate', 'club', 'club.tenant']
                });
            }
            catch (dbError) {
                console.error('Database error fetching player:', dbError);
                throw new common_1.BadRequestException('Unable to fetch player. Please try again.');
            }
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || !player.club.id) {
                throw new common_1.BadRequestException('Player club information is missing');
            }
            if (player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (userId && !tenantId && headerClubId) {
                try {
                    const affiliate = await this.affiliatesService.findByUserAndClub(userId.trim(), clubId);
                    if (!affiliate) {
                        throw new common_1.ForbiddenException('You are not an affiliate for this club');
                    }
                    if (!player.affiliate || player.affiliate.id !== affiliate.id) {
                        throw new common_1.ForbiddenException('You can only view players you referred');
                    }
                }
                catch (affiliateError) {
                    if (affiliateError instanceof common_1.ForbiddenException || affiliateError instanceof common_1.NotFoundException) {
                        throw affiliateError;
                    }
                    console.warn('Affiliate validation failed:', affiliateError);
                }
            }
            if (!player.id || !player.name || !player.email) {
                throw new common_1.BadRequestException('Player data is incomplete or corrupted');
            }
            if (!player.status) {
                console.warn(`Player ${playerId} has no status, defaulting to Active`);
                player.status = 'Active';
            }
            return {
                id: player.id,
                name: player.name,
                email: player.email,
                phoneNumber: player.phoneNumber,
                playerId: player.playerId,
                status: player.status,
                totalSpent: Number(player.totalSpent) || 0,
                totalCommission: Number(player.totalCommission) || 0,
                affiliate: player.affiliate ? {
                    id: player.affiliate.id,
                    code: player.affiliate.code
                } : null,
                notes: player.notes,
                createdAt: player.createdAt,
                updatedAt: player.updatedAt,
                club: {
                    id: player.club.id,
                    name: player.club.name,
                    code: player.club.code
                }
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get player'));
        }
    }
    async updatePlayer(clubId, playerId, dto, tenantId) {
        var _a, _b;
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!dto || typeof dto !== 'object') {
                throw new common_1.BadRequestException('Request body is required');
            }
            const hasUpdateFields = dto.name !== undefined || dto.email !== undefined ||
                dto.phoneNumber !== undefined || dto.playerId !== undefined ||
                dto.notes !== undefined || dto.status !== undefined;
            if (!hasUpdateFields) {
                throw new common_1.BadRequestException('At least one field must be provided for update');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            let player = null;
            try {
                player = await this.playersRepo.findOne({
                    where: { id: playerId, club: { id: clubId } },
                    relations: ['club']
                });
            }
            catch (dbError) {
                console.error('Database error fetching player:', dbError);
                throw new common_1.BadRequestException('Unable to fetch player. Please try again.');
            }
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended' && dto.status !== 'Active' && dto.status !== 'Inactive') {
                if (dto.email !== undefined || dto.name !== undefined) {
                    console.warn(`Attempting to update suspended player ${playerId}`);
                }
            }
            if (dto.name !== undefined) {
                if (!dto.name || typeof dto.name !== 'string' || !dto.name.trim()) {
                    throw new common_1.BadRequestException('Name cannot be empty');
                }
                const trimmedName = dto.name.trim();
                if (trimmedName.length < 2) {
                    throw new common_1.BadRequestException('Name must be at least 2 characters');
                }
                if (trimmedName.length > 200) {
                    throw new common_1.BadRequestException('Name cannot exceed 200 characters');
                }
                if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
                    throw new common_1.BadRequestException('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
                }
                player.name = trimmedName;
            }
            if (dto.email !== undefined) {
                if (!dto.email || typeof dto.email !== 'string' || !dto.email.trim()) {
                    throw new common_1.BadRequestException('Email cannot be empty');
                }
                const trimmedEmail = dto.email.trim().toLowerCase();
                if (trimmedEmail.length > 200) {
                    throw new common_1.BadRequestException('Email cannot exceed 200 characters');
                }
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(trimmedEmail)) {
                    throw new common_1.BadRequestException('Invalid email format');
                }
                const emailParts = trimmedEmail.split('@');
                if (emailParts.length !== 2 || !emailParts[1] || emailParts[1].length < 4) {
                    throw new common_1.BadRequestException('Invalid email domain');
                }
                let existingPlayer = null;
                try {
                    existingPlayer = await this.playersRepo.findOne({
                        where: { club: { id: clubId }, email: trimmedEmail }
                    });
                }
                catch (dbError) {
                    console.error('Database error checking existing email:', dbError);
                    throw new common_1.BadRequestException('Unable to verify email. Please try again.');
                }
                if (existingPlayer && existingPlayer.id !== playerId) {
                    throw new common_1.ConflictException('A player with this email already exists in this club');
                }
                player.email = trimmedEmail;
            }
            if (dto.phoneNumber !== undefined) {
                if (dto.phoneNumber === null || dto.phoneNumber === '') {
                    player.phoneNumber = null;
                }
                else {
                    if (typeof dto.phoneNumber !== 'string') {
                        throw new common_1.BadRequestException('Phone number must be a string');
                    }
                    const trimmedPhone = dto.phoneNumber.trim();
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
            if (dto.playerId !== undefined) {
                if (dto.playerId === null || dto.playerId === '') {
                    player.playerId = null;
                }
                else {
                    if (typeof dto.playerId !== 'string') {
                        throw new common_1.BadRequestException('Player ID must be a string');
                    }
                    const trimmedPlayerId = dto.playerId.trim();
                    if (trimmedPlayerId.length > 100) {
                        throw new common_1.BadRequestException('Player ID cannot exceed 100 characters');
                    }
                    player.playerId = trimmedPlayerId;
                }
            }
            if (dto.notes !== undefined) {
                if (dto.notes === null || dto.notes === '') {
                    player.notes = null;
                }
                else {
                    if (typeof dto.notes !== 'string') {
                        throw new common_1.BadRequestException('Notes must be a string');
                    }
                    const trimmedNotes = dto.notes.trim();
                    if (trimmedNotes.length > 500) {
                        throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
                    }
                    player.notes = trimmedNotes;
                }
            }
            if (dto.status !== undefined) {
                const validStatuses = ['Active', 'Inactive', 'Suspended'];
                if (!dto.status || typeof dto.status !== 'string' || !validStatuses.includes(dto.status.trim())) {
                    throw new common_1.BadRequestException(`Status must be one of: ${validStatuses.join(', ')}`);
                }
                player.status = dto.status.trim();
            }
            let savedPlayer;
            try {
                savedPlayer = await this.playersRepo.save(player);
            }
            catch (saveError) {
                console.error('Database error saving player:', saveError);
                if (saveError.code === '23505' || ((_a = saveError.message) === null || _a === void 0 ? void 0 : _a.includes('unique')) || ((_b = saveError.message) === null || _b === void 0 ? void 0 : _b.includes('duplicate'))) {
                    throw new common_1.ConflictException('A player with this email already exists in this club');
                }
                throw new common_1.BadRequestException('Unable to update player. Please try again.');
            }
            if (!savedPlayer || !savedPlayer.id) {
                throw new common_1.BadRequestException('Player update failed. Please try again.');
            }
            return {
                id: savedPlayer.id,
                name: savedPlayer.name,
                email: savedPlayer.email,
                phoneNumber: savedPlayer.phoneNumber,
                playerId: savedPlayer.playerId,
                status: savedPlayer.status,
                notes: savedPlayer.notes,
                updatedAt: savedPlayer.updatedAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to update player'));
        }
    }
    async getPlayerBalance(clubId, playerId, tenantId, headerClubId, userId) {
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view players for your assigned club');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            let transactions = [];
            try {
                transactions = await this.transactionsRepo.find({
                    where: {
                        club: { id: clubId },
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
                    if (isNaN(amount) || amount < 0) {
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
            if (isNaN(availableBalance) || !isFinite(availableBalance)) {
                console.error('Invalid balance calculated for player:', playerId);
                availableBalance = 0;
            }
            return {
                playerId: player.id,
                playerName: player.name,
                availableBalance: availableBalance,
                tableBalance: 0,
                totalBalance: availableBalance,
                clubId: clubId
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get player balance'));
        }
    }
    async getPlayerTransactions(clubId, playerId, tenantId, headerClubId, userId, limit, offset) {
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            if (headerClubId !== undefined && headerClubId !== null) {
                if (typeof headerClubId !== 'string' || !headerClubId.trim()) {
                    throw new common_1.BadRequestException('x-club-id header must be a non-empty string if provided');
                }
                if (!uuidRegex.test(headerClubId.trim())) {
                    throw new common_1.BadRequestException('Invalid club ID format in header');
                }
            }
            if (!tenantId && !headerClubId) {
                throw new common_1.BadRequestException('x-club-id header is required for CASHIER role');
            }
            const limitNum = limit ? parseInt(limit, 10) : 50;
            const offsetNum = offset ? parseInt(offset, 10) : 0;
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
                throw new common_1.BadRequestException('Limit must be between 1 and 100');
            }
            if (isNaN(offsetNum) || offsetNum < 0) {
                throw new common_1.BadRequestException('Offset must be 0 or greater');
            }
            if (offsetNum > 10000) {
                throw new common_1.BadRequestException('Offset cannot exceed 10000');
            }
            let club;
            try {
                club = await this.clubsService.findById(clubId);
            }
            catch (dbError) {
                console.error('Database error fetching club:', dbError);
                throw new common_1.BadRequestException('Unable to verify club. Please try again.');
            }
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId && !headerClubId) {
                try {
                    await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
                }
                catch (validationError) {
                    if (validationError instanceof common_1.ForbiddenException || validationError instanceof common_1.NotFoundException) {
                        throw validationError;
                    }
                    throw new common_1.BadRequestException('Unable to validate tenant. Please try again.');
                }
            }
            if (headerClubId && headerClubId.trim() !== clubId) {
                throw new common_1.ForbiddenException('You can only view players for your assigned club');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            let transactions = [];
            let total = 0;
            try {
                [transactions, total] = await this.transactionsRepo.findAndCount({
                    where: {
                        club: { id: clubId },
                        playerId: player.id
                    },
                    order: { createdAt: 'DESC' },
                    take: limitNum,
                    skip: offsetNum
                });
            }
            catch (dbError) {
                console.error('Database error fetching transactions:', dbError);
                throw new common_1.BadRequestException('Unable to fetch transactions. Please try again.');
            }
            if (offsetNum >= total && total > 0) {
                throw new common_1.BadRequestException('Offset exceeds total number of transactions');
            }
            return {
                transactions: transactions.map(t => ({
                    id: t.id,
                    type: t.type,
                    amount: Number(t.amount),
                    status: t.status,
                    notes: t.notes,
                    createdAt: t.createdAt,
                    updatedAt: t.updatedAt
                })),
                total,
                limit: limitNum,
                offset: offsetNum
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to get player transactions'));
        }
    }
    async createPlayerTransaction(clubId, playerId, dto, tenantId) {
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club']
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status && player.status.toLowerCase() === 'suspended') {
                throw new common_1.ForbiddenException('Cannot create transaction for suspended player. Please activate the player first.');
            }
            if (!dto.type || typeof dto.type !== 'string') {
                throw new common_1.BadRequestException('Transaction type is required');
            }
            const validTransactionTypes = Object.values(financial_transaction_entity_1.TransactionType);
            if (!validTransactionTypes.includes(dto.type)) {
                throw new common_1.BadRequestException(`Invalid transaction type. Must be one of: ${validTransactionTypes.join(', ')}`);
            }
            let transaction;
            try {
                transaction = await this.financialTransactionsService.create(clubId, {
                    type: dto.type,
                    playerId: player.id,
                    playerName: player.name,
                    amount: dto.amount,
                    notes: dto.notes
                });
            }
            catch (createError) {
                console.error('Error creating transaction:', createError);
                if (createError instanceof common_1.BadRequestException || createError instanceof common_1.ConflictException) {
                    throw createError;
                }
                throw new common_1.BadRequestException('Unable to create transaction. Please try again.');
            }
            if (!transaction || !transaction.id) {
                throw new common_1.BadRequestException('Transaction creation failed. Please try again.');
            }
            return {
                id: transaction.id,
                type: transaction.type,
                playerId: transaction.playerId,
                playerName: transaction.playerName,
                amount: Number(transaction.amount),
                status: transaction.status,
                notes: transaction.notes,
                createdAt: transaction.createdAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to create transaction'));
        }
    }
    async suspendPlayer(clubId, playerId, tenantId) {
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status === 'Suspended') {
                throw new common_1.ConflictException('Player is already suspended');
            }
            const pendingTransactions = await this.transactionsRepo.count({
                where: {
                    club: { id: clubId },
                    playerId: player.id,
                    status: financial_transaction_entity_1.TransactionStatus.PENDING
                }
            });
            if (pendingTransactions > 0) {
                throw new common_1.ConflictException('Cannot suspend player with pending transactions. Please resolve all pending transactions first.');
            }
            const waitlistEntries = await this.waitlistSeatingService.getWaitlist(clubId);
            const playerSeated = waitlistEntries.find(e => e.playerId === player.id && e.status === waitlist_entry_entity_1.WaitlistStatus.SEATED);
            if (playerSeated) {
                throw new common_1.ConflictException('Cannot suspend player who is currently seated. Please unseat the player first.');
            }
            player.status = 'Suspended';
            let savedPlayer;
            try {
                savedPlayer = await this.playersRepo.save(player);
            }
            catch (saveError) {
                console.error('Database error suspending player:', saveError);
                throw new common_1.BadRequestException('Unable to suspend player. Please try again.');
            }
            if (!savedPlayer || !savedPlayer.id) {
                throw new common_1.BadRequestException('Player suspension failed. Please try again.');
            }
            return {
                id: savedPlayer.id,
                name: savedPlayer.name,
                email: savedPlayer.email,
                status: savedPlayer.status,
                updatedAt: savedPlayer.updatedAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to suspend player'));
        }
    }
    async activatePlayer(clubId, playerId, tenantId) {
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            if (player.status === 'Active') {
                throw new common_1.ConflictException('Player is already active');
            }
            player.status = 'Active';
            let savedPlayer;
            try {
                savedPlayer = await this.playersRepo.save(player);
            }
            catch (saveError) {
                console.error('Database error activating player:', saveError);
                throw new common_1.BadRequestException('Unable to activate player. Please try again.');
            }
            if (!savedPlayer || !savedPlayer.id) {
                throw new common_1.BadRequestException('Player activation failed. Please try again.');
            }
            return {
                id: savedPlayer.id,
                name: savedPlayer.name,
                email: savedPlayer.email,
                status: savedPlayer.status,
                updatedAt: savedPlayer.updatedAt
            };
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to activate player'));
        }
    }
    async deletePlayer(clubId, playerId, tenantId) {
        var _a;
        try {
            if (tenantId !== undefined && tenantId !== null) {
                if (typeof tenantId !== 'string' || !tenantId.trim()) {
                    throw new common_1.BadRequestException('x-tenant-id header must be a non-empty string if provided');
                }
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (!uuidRegex.test(tenantId.trim())) {
                    throw new common_1.BadRequestException('Invalid tenant ID format');
                }
            }
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            const club = await this.clubsService.findById(clubId);
            if (!club) {
                throw new common_1.NotFoundException('Club not found');
            }
            if (tenantId) {
                await this.clubsService.validateClubBelongsToTenant(clubId, tenantId.trim());
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } }
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            if (!player.club || player.club.id !== clubId) {
                throw new common_1.ForbiddenException('Player does not belong to this club');
            }
            let pendingTransactions = 0;
            try {
                pendingTransactions = await this.transactionsRepo.count({
                    where: {
                        club: { id: clubId },
                        playerId: player.id,
                        status: financial_transaction_entity_1.TransactionStatus.PENDING
                    }
                });
            }
            catch (dbError) {
                console.error('Database error checking pending transactions:', dbError);
                throw new common_1.BadRequestException('Unable to verify player transactions. Please try again.');
            }
            if (pendingTransactions > 0) {
                throw new common_1.ConflictException('Cannot delete player with pending transactions. Please resolve all pending transactions first.');
            }
            let waitlistEntries = [];
            try {
                waitlistEntries = await this.waitlistSeatingService.getWaitlist(clubId);
            }
            catch (dbError) {
                console.error('Database error checking waitlist:', dbError);
                throw new common_1.BadRequestException('Unable to verify waitlist status. Please try again.');
            }
            const playerOnWaitlist = waitlistEntries.find(e => e.playerId === player.id && (e.status === waitlist_entry_entity_1.WaitlistStatus.PENDING || e.status === waitlist_entry_entity_1.WaitlistStatus.SEATED));
            if (playerOnWaitlist) {
                throw new common_1.ConflictException('Cannot delete player who is on waitlist or seated. Please remove from waitlist first.');
            }
            try {
                await this.playersRepo.remove(player);
            }
            catch (deleteError) {
                console.error('Database error deleting player:', deleteError);
                if (deleteError.code === '23503' || ((_a = deleteError.message) === null || _a === void 0 ? void 0 : _a.includes('foreign key'))) {
                    throw new common_1.ConflictException('Cannot delete player due to existing references. Please remove all related records first.');
                }
                throw new common_1.BadRequestException('Unable to delete player. Please try again.');
            }
        }
        catch (e) {
            if (e instanceof common_1.BadRequestException || e instanceof common_1.NotFoundException || e instanceof common_1.ForbiddenException || e instanceof common_1.ConflictException) {
                throw e;
            }
            throw new common_1.BadRequestException((e instanceof Error ? e.message : 'Failed to delete player'));
        }
    }
    async createFnbOrder(clubId, dto, userId) {
        return await this.fnbService.createOrder(clubId, dto, userId);
    }
    async getFnbOrders(clubId, status, tableNumber, playerId, dateFrom, dateTo) {
        return await this.fnbService.getOrders(clubId, {
            status,
            tableNumber,
            playerId,
            dateFrom,
            dateTo,
        });
    }
    async getFnbOrder(clubId, orderId) {
        return await this.fnbService.getOrder(clubId, orderId);
    }
    async updateFnbOrder(clubId, orderId, dto, userId) {
        return await this.fnbService.updateOrderStatus(clubId, orderId, dto, userId);
    }
    async cancelFnbOrder(clubId, orderId, userId) {
        return await this.fnbService.cancelOrder(clubId, orderId, userId);
    }
    async createMenuItem(clubId, dto) {
        return await this.fnbService.createMenuItem(clubId, dto);
    }
    async getMenuItems(clubId, category, available, search) {
        return await this.fnbService.getMenuItems(clubId, {
            category,
            available: available === 'true',
            search,
        });
    }
    async getMenuItem(clubId, itemId) {
        return await this.fnbService.getMenuItem(clubId, itemId);
    }
    async updateMenuItem(clubId, itemId, dto) {
        return await this.fnbService.updateMenuItem(clubId, itemId, dto);
    }
    async deleteMenuItem(clubId, itemId) {
        return await this.fnbService.deleteMenuItem(clubId, itemId);
    }
    async getMenuCategories(clubId) {
        return await this.fnbService.getCategories(clubId);
    }
    async createInventoryItem(clubId, dto) {
        return await this.fnbService.createInventoryItem(clubId, dto);
    }
    async getInventoryItems(clubId, category, lowStock, outOfStock) {
        return await this.fnbService.getInventoryItems(clubId, {
            category,
            lowStock: lowStock === 'true',
            outOfStock: outOfStock === 'true',
        });
    }
    async getInventoryItem(clubId, itemId) {
        return await this.fnbService.getInventoryItem(clubId, itemId);
    }
    async updateInventoryItem(clubId, itemId, dto) {
        return await this.fnbService.updateInventoryItem(clubId, itemId, dto);
    }
    async deleteInventoryItem(clubId, itemId) {
        return await this.fnbService.deleteInventoryItem(clubId, itemId);
    }
    async getLowStockItems(clubId) {
        return await this.fnbService.getLowStockItems(clubId);
    }
    async getOutOfStockItems(clubId) {
        return await this.fnbService.getOutOfStockItems(clubId);
    }
    async createSupplier(clubId, dto) {
        return await this.fnbService.createSupplier(clubId, dto);
    }
    async getSuppliers(clubId, activeOnly) {
        return await this.fnbService.getSuppliers(clubId, activeOnly === 'true');
    }
    async getSupplier(clubId, supplierId) {
        return await this.fnbService.getSupplier(clubId, supplierId);
    }
    async updateSupplier(clubId, supplierId, dto) {
        return await this.fnbService.updateSupplier(clubId, supplierId, dto);
    }
    async deleteSupplier(clubId, supplierId) {
        return await this.fnbService.deleteSupplier(clubId, supplierId);
    }
    async getFnbOrderAnalytics(clubId, dateFrom, dateTo) {
        return await this.fnbService.getOrderAnalytics(clubId, dateFrom, dateTo);
    }
    async getPopularItems(clubId, limit, dateFrom, dateTo) {
        return await this.fnbService.getPopularItems(clubId, limit ? parseInt(limit) : 10, dateFrom, dateTo);
    }
};
exports.ClubsController = ClubsController;
__decorate([
    (0, common_1.Post)('verify-code'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_club_code_dto_1.VerifyClubCodeDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "verifyClubCode", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.GlobalRole.MASTER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_club_dto_1.CreateClubDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/logo-upload-url'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createClubLogoUploadUrl", null);
__decorate([
    (0, common_1.Post)(':id/admins'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, assign_admin_dto_1.AssignAdminDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "assignAdmin", null);
__decorate([
    (0, common_1.Get)(':id/admins'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "listAdmins", null);
__decorate([
    (0, common_1.Delete)(':id/admins/:userId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('userId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "removeAdmin", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.GlobalRole.MASTER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.HR, roles_1.ClubRole.STAFF, roles_1.ClubRole.AFFILIATE, roles_1.ClubRole.CASHIER, roles_1.ClubRole.GRE),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getClub", null);
__decorate([
    (0, common_1.Get)(':id/revenue'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.GlobalRole.MASTER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getClubRevenue", null);
__decorate([
    (0, common_1.Post)(':id/users'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.HR),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_club_user_dto_1.CreateClubUserDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createClubUser", null);
__decorate([
    (0, common_1.Get)(':id/users'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.HR),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "listClubUsers", null);
__decorate([
    (0, common_1.Delete)(':id/users/:userId/roles/:role'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('userId', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "removeClubUserRole", null);
__decorate([
    (0, common_1.Get)(':id/staff'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.HR, roles_1.ClubRole.STAFF),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "listStaff", null);
__decorate([
    (0, common_1.Get)(':id/staff/:staffId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.HR),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('staffId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getStaff", null);
__decorate([
    (0, common_1.Post)(':id/staff'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_staff_dto_1.CreateStaffDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createStaff", null);
__decorate([
    (0, common_1.Put)(':id/staff/:staffId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('staffId', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, update_staff_dto_1.UpdateStaffDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateStaff", null);
__decorate([
    (0, common_1.Delete)(':id/staff/:staffId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('staffId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "removeStaff", null);
__decorate([
    (0, common_1.Get)(':id/credit-requests'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "listCreditRequests", null);
__decorate([
    (0, common_1.Post)(':id/credit-requests'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_credit_request_dto_1.CreateCreditRequestDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createCreditRequest", null);
__decorate([
    (0, common_1.Post)(':id/credit-requests/:requestId/approve'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('requestId', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, approve_credit_dto_1.ApproveCreditDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "approveCreditRequest", null);
__decorate([
    (0, common_1.Post)(':id/credit-requests/:requestId/deny'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('requestId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "denyCreditRequest", null);
__decorate([
    (0, common_1.Put)(':id/credit-requests/:requestId/visibility'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('requestId', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, update_credit_visibility_dto_1.UpdateCreditVisibilityDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateCreditVisibility", null);
__decorate([
    (0, common_1.Put)(':id/credit-requests/:requestId/limit'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('requestId', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, update_credit_limit_dto_1.UpdateCreditLimitDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateCreditLimit", null);
__decorate([
    (0, common_1.Get)(':id/transactions'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "listTransactions", null);
__decorate([
    (0, common_1.Post)(':id/transactions'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_transaction_dto_1.CreateTransactionDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createTransaction", null);
__decorate([
    (0, common_1.Put)(':id/transactions/:transactionId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('transactionId', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, update_transaction_dto_1.UpdateTransactionDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateTransaction", null);
__decorate([
    (0, common_1.Post)(':id/transactions/:transactionId/cancel'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('transactionId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "cancelTransaction", null);
__decorate([
    (0, common_1.Get)(':id/vip-products'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "listVipProducts", null);
__decorate([
    (0, common_1.Post)(':id/vip-products'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_vip_product_dto_1.CreateVipProductDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createVipProduct", null);
__decorate([
    (0, common_1.Put)(':id/vip-products/:productId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('productId', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_vip_product_dto_1.UpdateVipProductDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateVipProduct", null);
__decorate([
    (0, common_1.Delete)(':id/vip-products/:productId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('productId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "removeVipProduct", null);
__decorate([
    (0, common_1.Get)(':id/settings'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getClubSettings", null);
__decorate([
    (0, common_1.Put)(':id/settings/:key'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('key')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, set_club_setting_dto_1.SetClubSettingDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "setClubSetting", null);
__decorate([
    (0, common_1.Get)(':id/stats'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getClubStats", null);
__decorate([
    (0, common_1.Post)(':id/waitlist'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_waitlist_entry_dto_1.CreateWaitlistEntryDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createWaitlistEntry", null);
__decorate([
    (0, common_1.Get)(':id/waitlist'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE, roles_1.ClubRole.STAFF),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getWaitlist", null);
__decorate([
    (0, common_1.Get)(':id/waitlist/:entryId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('entryId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getWaitlistEntry", null);
__decorate([
    (0, common_1.Put)(':id/waitlist/:entryId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('entryId', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, update_waitlist_entry_dto_1.UpdateWaitlistEntryDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateWaitlistEntry", null);
__decorate([
    (0, common_1.Post)(':id/waitlist/:entryId/cancel'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.GRE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('entryId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "cancelWaitlistEntry", null);
__decorate([
    (0, common_1.Delete)(':id/waitlist/:entryId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.GRE),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('entryId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deleteWaitlistEntry", null);
__decorate([
    (0, common_1.Post)(':id/waitlist/:entryId/assign-seat'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __param(3, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(4, (0, common_1.Param)('entryId', new common_1.ParseUUIDPipe())),
    __param(5, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object, String, String, assign_seat_dto_1.AssignSeatDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "assignSeat", null);
__decorate([
    (0, common_1.Post)(':id/waitlist/:entryId/unseat'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('entryId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "unseatPlayer", null);
__decorate([
    (0, common_1.Post)(':id/tables'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, create_table_dto_1.CreateTableDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createTable", null);
__decorate([
    (0, common_1.Get)(':id/tables'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER, roles_1.ClubRole.GRE, roles_1.ClubRole.STAFF),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('tableType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getTables", null);
__decorate([
    (0, common_1.Get)(':id/tables/:tableId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.GRE),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('tableId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getTable", null);
__decorate([
    (0, common_1.Put)(':id/tables/:tableId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('tableId', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, update_table_dto_1.UpdateTableDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateTable", null);
__decorate([
    (0, common_1.Delete)(':id/tables/:tableId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Param)('tableId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deleteTable", null);
__decorate([
    (0, common_1.Get)(':id/analytics/revenue'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getRevenueAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/analytics/players'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getPlayerAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/analytics/staff'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.HR),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getStaffAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/analytics/tables'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getTableAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/analytics/waitlist'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('startDate')),
    __param(4, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getWaitlistAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/analytics/dashboard'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getDashboardStats", null);
__decorate([
    (0, common_1.Get)(':id/settings'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getAllSettings", null);
__decorate([
    (0, common_1.Get)(':id/settings/:key'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getSetting", null);
__decorate([
    (0, common_1.Put)(':id/settings/:key'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('key')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, set_club_setting_dto_1.SetClubSettingDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "setSetting", null);
__decorate([
    (0, common_1.Delete)(':id/settings/:key'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Param)('key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deleteSetting", null);
__decorate([
    (0, common_1.Get)(':id/audit-logs'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('action')),
    __param(5, (0, common_1.Query)('entityType')),
    __param(6, (0, common_1.Query)('startDate')),
    __param(7, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)(':id/audit-logs/export'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Query)('startDate')),
    __param(3, (0, common_1.Query)('endDate')),
    __param(4, (0, common_1.Query)('format')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "exportAuditLogs", null);
__decorate([
    (0, common_1.Post)(':id/affiliates'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_affiliate_dto_1.CreateAffiliateDto, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createAffiliate", null);
__decorate([
    (0, common_1.Get)(':id/affiliates'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getAffiliates", null);
__decorate([
    (0, common_1.Get)(':id/affiliates/:affiliateId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('affiliateId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getAffiliate", null);
__decorate([
    (0, common_1.Put)(':id/affiliates/:affiliateId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.AFFILIATE),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('affiliateId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __param(5, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateAffiliate", null);
__decorate([
    (0, common_1.Get)(':id/affiliates/:affiliateId/stats'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('affiliateId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getAffiliateStats", null);
__decorate([
    (0, common_1.Post)(':id/players'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_player_dto_1.CreatePlayerDto, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createPlayer", null);
__decorate([
    (0, common_1.Get)(':id/affiliates/:affiliateId/players'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('affiliateId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getAffiliatePlayers", null);
__decorate([
    (0, common_1.Get)(':id/players'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER, roles_1.ClubRole.GRE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Headers)('x-tenant-id')),
    __param(2, (0, common_1.Headers)('x-club-id')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getPlayers", null);
__decorate([
    (0, common_1.Get)(':id/players/:playerId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER, roles_1.ClubRole.GRE, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getPlayer", null);
__decorate([
    (0, common_1.Put)(':id/players/:playerId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_player_dto_1.UpdatePlayerDto, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updatePlayer", null);
__decorate([
    (0, common_1.Get)(':id/players/:playerId/balance'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getPlayerBalance", null);
__decorate([
    (0, common_1.Get)(':id/players/:playerId/transactions'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.CASHIER, roles_1.ClubRole.AFFILIATE),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __param(3, (0, common_1.Headers)('x-club-id')),
    __param(4, (0, common_1.Headers)('x-user-id')),
    __param(5, (0, common_1.Query)('limit')),
    __param(6, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getPlayerTransactions", null);
__decorate([
    (0, common_1.Post)(':id/players/:playerId/transactions'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_transaction_dto_1.CreateTransactionDto, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createPlayerTransaction", null);
__decorate([
    (0, common_1.Post)(':id/players/:playerId/suspend'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "suspendPlayer", null);
__decorate([
    (0, common_1.Post)(':id/players/:playerId/activate'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "activatePlayer", null);
__decorate([
    (0, common_1.Delete)(':id/players/:playerId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('playerId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-tenant-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deletePlayer", null);
__decorate([
    (0, common_1.Post)(':id/fnb/orders'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_fnb_order_dto_1.CreateFnbOrderDto, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createFnbOrder", null);
__decorate([
    (0, common_1.Get)(':id/fnb/orders'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('tableNumber')),
    __param(3, (0, common_1.Query)('playerId')),
    __param(4, (0, common_1.Query)('dateFrom')),
    __param(5, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getFnbOrders", null);
__decorate([
    (0, common_1.Get)(':id/fnb/orders/:orderId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getFnbOrder", null);
__decorate([
    (0, common_1.Patch)(':id/fnb/orders/:orderId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_fnb_order_dto_1.UpdateFnbOrderDto, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateFnbOrder", null);
__decorate([
    (0, common_1.Delete)(':id/fnb/orders/:orderId/cancel'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('orderId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Headers)('x-user-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "cancelFnbOrder", null);
__decorate([
    (0, common_1.Post)(':id/fnb/menu'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_menu_item_dto_1.CreateMenuItemDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createMenuItem", null);
__decorate([
    (0, common_1.Get)(':id/fnb/menu'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('available')),
    __param(3, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getMenuItems", null);
__decorate([
    (0, common_1.Get)(':id/fnb/menu/:itemId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getMenuItem", null);
__decorate([
    (0, common_1.Patch)(':id/fnb/menu/:itemId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_menu_item_dto_1.UpdateMenuItemDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateMenuItem", null);
__decorate([
    (0, common_1.Delete)(':id/fnb/menu/:itemId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deleteMenuItem", null);
__decorate([
    (0, common_1.Get)(':id/fnb/categories'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getMenuCategories", null);
__decorate([
    (0, common_1.Post)(':id/fnb/inventory'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_inventory_item_dto_1.CreateInventoryItemDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createInventoryItem", null);
__decorate([
    (0, common_1.Get)(':id/fnb/inventory'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('lowStock')),
    __param(3, (0, common_1.Query)('outOfStock')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getInventoryItems", null);
__decorate([
    (0, common_1.Get)(':id/fnb/inventory/:itemId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getInventoryItem", null);
__decorate([
    (0, common_1.Patch)(':id/fnb/inventory/:itemId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_inventory_item_dto_1.UpdateInventoryItemDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateInventoryItem", null);
__decorate([
    (0, common_1.Delete)(':id/fnb/inventory/:itemId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deleteInventoryItem", null);
__decorate([
    (0, common_1.Get)(':id/fnb/inventory-alerts/low-stock'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getLowStockItems", null);
__decorate([
    (0, common_1.Get)(':id/fnb/inventory-alerts/out-of-stock'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getOutOfStockItems", null);
__decorate([
    (0, common_1.Post)(':id/fnb/suppliers'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_supplier_dto_1.CreateSupplierDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "createSupplier", null);
__decorate([
    (0, common_1.Get)(':id/fnb/suppliers'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('activeOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getSuppliers", null);
__decorate([
    (0, common_1.Get)(':id/fnb/suppliers/:supplierId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('supplierId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getSupplier", null);
__decorate([
    (0, common_1.Patch)(':id/fnb/suppliers/:supplierId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('supplierId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_supplier_dto_1.UpdateSupplierDto]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "updateSupplier", null);
__decorate([
    (0, common_1.Delete)(':id/fnb/suppliers/:supplierId'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('supplierId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "deleteSupplier", null);
__decorate([
    (0, common_1.Get)(':id/fnb/analytics/orders'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('dateFrom')),
    __param(2, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getFnbOrderAnalytics", null);
__decorate([
    (0, common_1.Get)(':id/fnb/analytics/popular-items'),
    (0, roles_decorator_1.Roles)(roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('dateFrom')),
    __param(3, (0, common_1.Query)('dateTo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], ClubsController.prototype, "getPopularItems", null);
exports.ClubsController = ClubsController = __decorate([
    (0, common_1.Controller)('clubs'),
    __param(13, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __param(14, (0, typeorm_1.InjectRepository)(financial_transaction_entity_2.FinancialTransaction)),
    __param(15, (0, typeorm_1.InjectRepository)(affiliate_entity_1.Affiliate)),
    __metadata("design:paramtypes", [clubs_service_1.ClubsService,
        storage_service_1.StorageService,
        users_service_1.UsersService,
        staff_service_1.StaffService,
        credit_requests_service_1.CreditRequestsService,
        financial_transactions_service_1.FinancialTransactionsService,
        vip_products_service_1.VipProductsService,
        club_settings_service_1.ClubSettingsService,
        audit_logs_service_1.AuditLogsService,
        waitlist_seating_service_1.WaitlistSeatingService,
        analytics_service_1.AnalyticsService,
        affiliates_service_1.AffiliatesService,
        fnb_service_1.FnbService,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClubsController);
//# sourceMappingURL=clubs.controller.js.map