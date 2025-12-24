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
exports.TenantsController = void 0;
const common_1 = require("@nestjs/common");
const tenants_service_1 = require("./tenants.service");
const roles_guard_1 = require("../common/rbac/roles.guard");
const roles_1 = require("../common/rbac/roles");
const roles_decorator_1 = require("../common/rbac/roles.decorator");
const update_branding_dto_1 = require("./dto/update-branding.dto");
const create_tenant_dto_1 = require("./dto/create-tenant.dto");
const create_super_admin_dto_1 = require("./dto/create-super-admin.dto");
const setup_tenant_dto_1 = require("./dto/setup-tenant.dto");
const create_club_with_branding_dto_1 = require("../clubs/dto/create-club-with-branding.dto");
const storage_service_1 = require("../storage/storage.service");
const clubs_service_1 = require("../clubs/clubs.service");
const users_service_1 = require("../users/users.service");
let TenantsController = class TenantsController {
    constructor(tenantsService, storageService, clubsService, usersService) {
        this.tenantsService = tenantsService;
        this.storageService = storageService;
        this.clubsService = clubsService;
        this.usersService = usersService;
    }
    async list() {
        try {
            return await this.tenantsService.findAll();
        }
        catch (e) {
            console.error('Error in tenants.list():', e);
            throw e;
        }
    }
    create(dto) {
        try {
            if (!dto.name || !dto.name.trim()) {
                throw new common_1.BadRequestException('Tenant name is required');
            }
            return this.tenantsService.create(dto.name);
        }
        catch (e) {
            throw e;
        }
    }
    updateBranding(id, dto) {
        try {
            return this.tenantsService.updateBranding(id, dto);
        }
        catch (e) {
            throw e;
        }
    }
    async createLogoUploadUrl(id) {
        try {
            const path = `tenants/${id}/logo.png`;
            return await this.storageService.createSignedUploadUrl(path);
        }
        catch (e) {
            throw new common_1.BadRequestException('Failed to create signed upload URL');
        }
    }
    async createClubWithBranding(tenantId, dto) {
        try {
            if (!dto.name || !dto.name.trim()) {
                throw new common_1.BadRequestException('Club name is required');
            }
            if (!dto.superAdminEmail || !dto.superAdminEmail.trim()) {
                throw new common_1.BadRequestException('Super Admin email is required');
            }
            await this.storageService.ensureBucket();
            const club = await this.clubsService.createWithBranding(tenantId, {
                name: dto.name,
                description: dto.description,
                logoUrl: dto.logoUrl,
                videoUrl: dto.videoUrl,
                skinColor: dto.skinColor,
                gradient: dto.gradient
            });
            return club;
        }
        catch (e) {
            throw e;
        }
    }
    async createSuperAdmin(headerTenantId, tenantId, dto) {
        try {
            if (!dto.email || !dto.email.trim()) {
                throw new common_1.BadRequestException('Email is required');
            }
            if (headerTenantId) {
                if (headerTenantId !== tenantId) {
                    throw new common_1.BadRequestException('Tenant ID mismatch. Super Admin can only create Super Admins for their own tenant.');
                }
            }
            const result = await this.usersService.createSuperAdmin(dto.email, dto.displayName || null, tenantId);
            return {
                message: result.isExistingUser
                    ? 'Super Admin already exists and has been assigned to this tenant'
                    : 'Super Admin created successfully',
                user: result.user,
                tempPassword: result.tempPassword,
                tenantId: result.tenantId,
                isExistingUser: result.isExistingUser || false
            };
        }
        catch (e) {
            throw e;
        }
    }
    async setupTenant(tenantId, dto) {
        try {
            await this.storageService.ensureBucket();
            const club = await this.clubsService.createWithBranding(tenantId, {
                name: dto.clubName,
                description: dto.clubDescription,
                logoUrl: dto.logoUrl,
                videoUrl: dto.videoUrl,
                skinColor: dto.skinColor,
                gradient: dto.gradient
            });
            const superAdminResult = await this.usersService.createSuperAdmin(dto.superAdminEmail, dto.superAdminDisplayName || null, tenantId);
            return {
                message: 'Tenant setup completed successfully',
                tenant: { id: tenantId },
                club: {
                    id: club.id,
                    name: club.name,
                    description: club.description,
                    logoUrl: club.logoUrl,
                    videoUrl: club.videoUrl,
                    skinColor: club.skinColor,
                    gradient: club.gradient
                },
                superAdmin: {
                    user: superAdminResult.user,
                    tempPassword: superAdminResult.tempPassword,
                    email: superAdminResult.user.email,
                    isExistingUser: superAdminResult.isExistingUser || false
                }
            };
        }
        catch (e) {
            throw e;
        }
    }
    async createClubLogoUploadUrl(tenantId, clubId) {
        try {
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            const path = `tenants/${tenantId}/clubs/${clubId}/logo.png`;
            return await this.storageService.createSignedUploadUrl(path);
        }
        catch (e) {
            throw new common_1.BadRequestException('Failed to create signed upload URL');
        }
    }
    async getClubLogoUrl(tenantId, clubId) {
        try {
            await this.clubsService.validateClubBelongsToTenant(clubId, tenantId);
            const path = `tenants/${tenantId}/clubs/${clubId}/logo.png`;
            const logoUrl = this.storageService.getPublicUrl(path);
            return { logoUrl };
        }
        catch (e) {
            throw new common_1.BadRequestException('Failed to get logo URL');
        }
    }
};
exports.TenantsController = TenantsController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tenant_dto_1.CreateTenantDto]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/branding'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_branding_dto_1.UpdateBrandingDto]),
    __metadata("design:returntype", void 0)
], TenantsController.prototype, "updateBranding", null);
__decorate([
    (0, common_1.Post)(':id/branding/logo-upload-url'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createLogoUploadUrl", null);
__decorate([
    (0, common_1.Post)(':id/clubs'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_club_with_branding_dto_1.CreateClubWithBrandingDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createClubWithBranding", null);
__decorate([
    (0, common_1.Post)(':id/super-admins'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN, roles_1.TenantRole.SUPER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Headers)('x-tenant-id')),
    __param(1, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_super_admin_dto_1.CreateSuperAdminDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createSuperAdmin", null);
__decorate([
    (0, common_1.Post)(':id/setup'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, setup_tenant_dto_1.SetupTenantDto]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "setupTenant", null);
__decorate([
    (0, common_1.Post)(':tenantId/clubs/:clubId/logo-upload-url'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    __param(0, (0, common_1.Param)('tenantId', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('clubId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "createClubLogoUploadUrl", null);
__decorate([
    (0, common_1.Get)(':tenantId/clubs/:clubId/logo-url'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    __param(0, (0, common_1.Param)('tenantId', new common_1.ParseUUIDPipe())),
    __param(1, (0, common_1.Param)('clubId', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TenantsController.prototype, "getClubLogoUrl", null);
exports.TenantsController = TenantsController = __decorate([
    (0, common_1.Controller)('tenants'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [tenants_service_1.TenantsService,
        storage_service_1.StorageService,
        clubs_service_1.ClubsService,
        users_service_1.UsersService])
], TenantsController);
//# sourceMappingURL=tenants.controller.js.map