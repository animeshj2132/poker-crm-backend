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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../common/rbac/roles.decorator");
const roles_1 = require("../common/rbac/roles");
const roles_guard_1 = require("../common/rbac/roles.guard");
const users_service_1 = require("./users.service");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async listUsers() {
        const users = await this.usersService.findAll();
        return users.map(user => ({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            isMasterAdmin: user.isMasterAdmin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        }));
    }
    async getUser(userId) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            return null;
        }
        return {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            isMasterAdmin: user.isMasterAdmin,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        };
    }
    async getSuperAdminTenants(userId) {
        return this.usersService.getSuperAdminTenants(userId);
    }
    async getSuperAdminClubs(userId) {
        return this.usersService.getSuperAdminClubs(userId);
    }
    async getAdminClubs(userId) {
        return this.usersService.getAdminClubs(userId);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN, roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.HR, roles_1.ClubRole.STAFF, roles_1.ClubRole.AFFILIATE, roles_1.ClubRole.CASHIER, roles_1.ClubRole.GRE, roles_1.ClubRole.FNB),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getUser", null);
__decorate([
    (0, common_1.Get)(':id/tenants'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN, roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSuperAdminTenants", null);
__decorate([
    (0, common_1.Get)(':id/clubs'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN, roles_1.TenantRole.SUPER_ADMIN),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSuperAdminClubs", null);
__decorate([
    (0, common_1.Get)(':id/admin-clubs'),
    (0, roles_decorator_1.Roles)(roles_1.GlobalRole.MASTER_ADMIN, roles_1.TenantRole.SUPER_ADMIN, roles_1.ClubRole.ADMIN, roles_1.ClubRole.MANAGER, roles_1.ClubRole.HR, roles_1.ClubRole.STAFF, roles_1.ClubRole.AFFILIATE, roles_1.ClubRole.CASHIER, roles_1.ClubRole.GRE),
    __param(0, (0, common_1.Param)('id', new common_1.ParseUUIDPipe())),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getAdminClubs", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map