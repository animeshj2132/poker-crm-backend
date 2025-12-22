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
exports.ClubsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const club_entity_1 = require("./club.entity");
const tenant_entity_1 = require("../tenants/tenant.entity");
const user_club_role_entity_1 = require("../users/user-club-role.entity");
const roles_1 = require("../common/rbac/roles");
let ClubsService = class ClubsService {
    constructor(clubsRepo, tenantsRepo, userClubRoleRepo) {
        this.clubsRepo = clubsRepo;
        this.tenantsRepo = tenantsRepo;
        this.userClubRoleRepo = userClubRoleRepo;
    }
    async generateUniqueCode() {
        let code;
        let exists;
        do {
            code = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            const existing = await this.clubsRepo.findOne({ where: { code } });
            exists = !!existing;
        } while (exists);
        return code;
    }
    async create(tenantId, name) {
        if (!name || !name.trim()) {
            throw new common_1.BadRequestException('Club name is required');
        }
        if (name.trim().length < 2) {
            throw new common_1.BadRequestException('Club name must be at least 2 characters long');
        }
        if (name.trim().length > 200) {
            throw new common_1.BadRequestException('Club name cannot exceed 200 characters');
        }
        const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        const existingClub = await this.clubsRepo.findOne({
            where: { tenant: { id: tenantId }, name: name.trim() }
        });
        if (existingClub) {
            throw new common_1.ConflictException(`A club with name "${name}" already exists in this tenant`);
        }
        const code = await this.generateUniqueCode();
        const club = this.clubsRepo.create({
            name: name.trim(),
            tenant,
            code
        });
        return this.clubsRepo.save(club);
    }
    async createWithBranding(tenantId, data) {
        var _a, _b, _c, _d, _e;
        if (!data.name || !data.name.trim()) {
            throw new common_1.BadRequestException('Club name is required');
        }
        if (data.name.trim().length < 2) {
            throw new common_1.BadRequestException('Club name must be at least 2 characters long');
        }
        if (data.name.trim().length > 200) {
            throw new common_1.BadRequestException('Club name cannot exceed 200 characters');
        }
        const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        const existingClub = await this.clubsRepo.findOne({
            where: { tenant: { id: tenantId }, name: data.name.trim() }
        });
        if (existingClub) {
            throw new common_1.ConflictException(`A club with name "${data.name}" already exists in this tenant`);
        }
        const code = await this.generateUniqueCode();
        const club = this.clubsRepo.create({
            name: data.name.trim(),
            description: ((_a = data.description) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            logoUrl: ((_b = data.logoUrl) === null || _b === void 0 ? void 0 : _b.trim()) || null,
            videoUrl: ((_c = data.videoUrl) === null || _c === void 0 ? void 0 : _c.trim()) || null,
            skinColor: ((_d = data.skinColor) === null || _d === void 0 ? void 0 : _d.trim()) || null,
            gradient: ((_e = data.gradient) === null || _e === void 0 ? void 0 : _e.trim()) || null,
            tenant,
            code
        });
        return this.clubsRepo.save(club);
    }
    listByTenant(tenantId) {
        return this.clubsRepo.find({ where: { tenant: { id: tenantId } } });
    }
    async findById(id) {
        return this.clubsRepo.findOne({ where: { id }, relations: ['tenant'] });
    }
    async findByCode(code) {
        if (!code || typeof code !== 'string' || code.trim().length !== 6) {
            return null;
        }
        return this.clubsRepo.findOne({
            where: { code: code.trim() },
            relations: ['tenant']
        });
    }
    async validateClubBelongsToTenant(clubId, tenantId) {
        const club = await this.findById(clubId);
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        if (club.tenant.id !== tenantId) {
            throw new common_1.ForbiddenException('Club does not belong to this tenant');
        }
        return club;
    }
    async listClubAdmins(clubId) {
        const roles = await this.userClubRoleRepo.find({
            where: { club: { id: clubId }, role: roles_1.ClubRole.ADMIN },
            relations: ['user']
        });
        return roles.map((r) => ({
            id: r.user.id,
            email: r.user.email,
            displayName: r.user.displayName,
            roleId: r.id
        }));
    }
    async listClubUsers(clubId) {
        const roles = await this.userClubRoleRepo.find({
            where: { club: { id: clubId } },
            relations: ['user']
        });
        const userMap = new Map();
        for (const role of roles) {
            const userId = role.user.id;
            if (!userMap.has(userId)) {
                userMap.set(userId, {
                    id: role.user.id,
                    email: role.user.email,
                    displayName: role.user.displayName,
                    roles: []
                });
            }
            userMap.get(userId).roles.push({
                role: role.role,
                roleId: role.id
            });
        }
        return Array.from(userMap.values());
    }
    async getClubRevenue(clubId) {
        const club = await this.findById(clubId);
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const formatDate = (date) => date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
        const formatTime = (date) => date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const formatFull = (date) => date.toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return {
            clubId: club.id,
            clubName: club.name,
            previousDay: {
                revenue: 125000,
                rake: 12500,
                tips: 3750,
                date: formatDate(yesterday),
                time: formatTime(yesterday),
                lastUpdated: formatFull(yesterday)
            },
            currentDay: {
                revenue: 45230,
                rake: 4523,
                tips: 1357,
                date: formatDate(now),
                time: formatTime(now),
                lastUpdated: formatFull(now)
            },
            tipHoldPercent: 0.15
        };
    }
};
exports.ClubsService = ClubsService;
exports.ClubsService = ClubsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __param(1, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __param(2, (0, typeorm_1.InjectRepository)(user_club_role_entity_1.UserClubRole)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], ClubsService);
//# sourceMappingURL=clubs.service.js.map