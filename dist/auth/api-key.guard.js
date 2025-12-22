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
exports.ApiKeyAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const users_service_1 = require("../users/users.service");
const user_tenant_role_entity_1 = require("../users/user-tenant-role.entity");
const user_club_role_entity_1 = require("../users/user-club-role.entity");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
let ApiKeyAuthGuard = class ApiKeyAuthGuard {
    constructor(authService, usersService, userTenantRoleRepo, userClubRoleRepo) {
        this.authService = authService;
        this.usersService = usersService;
        this.userTenantRoleRepo = userTenantRoleRepo;
        this.userClubRoleRepo = userClubRoleRepo;
    }
    async canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const apiKey = req.headers['x-api-key'];
        if (apiKey) {
            const user = await this.authService.validateApiKey(apiKey);
            if (user) {
                req.user = user;
                return true;
            }
        }
        const userId = req.headers['x-user-id'];
        if (userId) {
            const user = await this.usersService.findById(userId);
            if (user) {
                const tenantRoles = await this.userTenantRoleRepo.find({
                    where: { user: { id: userId } },
                    relations: ['tenant']
                });
                const clubRoles = await this.userClubRoleRepo.find({
                    where: { user: { id: userId } },
                    relations: ['club']
                });
                req.user = {
                    id: user.id,
                    globalRoles: user.isMasterAdmin ? ['MASTER_ADMIN'] : [],
                    tenantRoles: tenantRoles.map(tr => ({
                        tenantId: tr.tenant.id,
                        roles: [tr.role]
                    })),
                    clubRoles: clubRoles.map(cr => ({
                        clubId: cr.club.id,
                        roles: [cr.role]
                    }))
                };
                return true;
            }
        }
        return true;
    }
};
exports.ApiKeyAuthGuard = ApiKeyAuthGuard;
exports.ApiKeyAuthGuard = ApiKeyAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectRepository)(user_tenant_role_entity_1.UserTenantRole)),
    __param(3, (0, typeorm_1.InjectRepository)(user_club_role_entity_1.UserClubRole)),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        users_service_1.UsersService,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ApiKeyAuthGuard);
//# sourceMappingURL=api-key.guard.js.map