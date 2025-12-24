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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./user.entity");
const user_club_role_entity_1 = require("./user-club-role.entity");
const user_tenant_role_entity_1 = require("./user-tenant-role.entity");
const club_entity_1 = require("../clubs/club.entity");
const roles_1 = require("../common/rbac/roles");
let UsersService = class UsersService {
    constructor(usersRepo, userClubRoleRepo, userTenantRoleRepo, clubsRepo) {
        this.usersRepo = usersRepo;
        this.userClubRoleRepo = userClubRoleRepo;
        this.userTenantRoleRepo = userTenantRoleRepo;
        this.clubsRepo = clubsRepo;
    }
    async findByEmail(email, includePassword = false) {
        if (includePassword) {
            return this.usersRepo.findOne({
                where: { email },
                select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'passwordHash', 'createdAt', 'updatedAt']
            });
        }
        return this.usersRepo.findOne({
            where: { email },
            select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'createdAt', 'updatedAt']
        });
    }
    async verifyPassword(email, plainPassword) {
        const user = await this.findByEmail(email, true);
        if (!user || !user.passwordHash)
            return false;
        return bcrypt.compare(plainPassword, user.passwordHash);
    }
    async updatePassword(userId, newPassword) {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        await this.usersRepo.update(userId, {
            passwordHash,
            mustResetPassword: false
        });
    }
    async resetPassword(email, currentPassword, newPassword) {
        if (!email || !email.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        if (!currentPassword || !currentPassword.trim()) {
            throw new common_1.BadRequestException('Current password is required');
        }
        if (!newPassword || !newPassword.trim()) {
            throw new common_1.BadRequestException('New password is required');
        }
        if (newPassword.length < 8) {
            throw new common_1.BadRequestException('New password must be at least 8 characters long');
        }
        if (newPassword.length > 120) {
            throw new common_1.BadRequestException('New password cannot exceed 120 characters');
        }
        if (currentPassword === newPassword) {
            throw new common_1.BadRequestException('New password must be different from current password');
        }
        const user = await this.findByEmail(email.trim(), true);
        if (!user || !user.passwordHash) {
            throw new common_1.NotFoundException('User not found');
        }
        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            throw new common_1.ConflictException('Current password is incorrect');
        }
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        await this.usersRepo.update(user.id, {
            passwordHash,
            mustResetPassword: false
        });
        return {
            success: true,
            mustResetPassword: false
        };
    }
    async createUser(email, displayName, password) {
        if (!email || !email.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        const existing = await this.findByEmail(email.trim());
        if (existing)
            throw new common_1.ConflictException('User with this email already exists');
        if (password) {
            if (password.length < 8) {
                throw new common_1.BadRequestException('Password must be at least 8 characters long');
            }
            if (password.length > 120) {
                throw new common_1.BadRequestException('Password cannot exceed 120 characters');
            }
        }
        let passwordHash = null;
        if (password) {
            const saltRounds = 12;
            passwordHash = await bcrypt.hash(password, saltRounds);
        }
        const user = this.usersRepo.create({
            email: email.trim(),
            displayName: (displayName === null || displayName === void 0 ? void 0 : displayName.trim()) || null,
            passwordHash,
            isMasterAdmin: false
        });
        return this.usersRepo.save(user);
    }
    async assignClubRole(userId, clubId, role) {
        if (!userId)
            throw new common_1.BadRequestException('User ID is required');
        if (!clubId)
            throw new common_1.BadRequestException('Club ID is required');
        if (!Object.values(roles_1.ClubRole).includes(role)) {
            throw new common_1.BadRequestException('Invalid club role');
        }
        const user = await this.findById(userId);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const existing = await this.userClubRoleRepo.findOne({
            where: { user: { id: userId }, club: { id: clubId }, role }
        });
        if (existing)
            throw new common_1.ConflictException('User already has this role for this club');
        const userClubRole = this.userClubRoleRepo.create({
            user: { id: userId },
            club: { id: clubId },
            role
        });
        return this.userClubRoleRepo.save(userClubRole);
    }
    async removeClubRole(userId, clubId, role) {
        if (!userId)
            throw new common_1.BadRequestException('User ID is required');
        if (!clubId)
            throw new common_1.BadRequestException('Club ID is required');
        if (!Object.values(roles_1.ClubRole).includes(role)) {
            throw new common_1.BadRequestException('Invalid club role');
        }
        const roleRecord = await this.userClubRoleRepo.findOne({
            where: { user: { id: userId }, club: { id: clubId }, role }
        });
        if (!roleRecord)
            throw new common_1.NotFoundException('Role assignment not found');
        await this.userClubRoleRepo.remove(roleRecord);
    }
    async findById(id, includePassword = false) {
        if (includePassword) {
            return this.usersRepo.findOne({
                where: { id },
                select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'passwordHash', 'createdAt', 'updatedAt']
            });
        }
        return this.usersRepo.findOne({
            where: { id },
            select: ['id', 'email', 'displayName', 'isMasterAdmin', 'mustResetPassword', 'createdAt', 'updatedAt']
        });
    }
    async findAll() {
        return this.usersRepo.find({
            select: ['id', 'email', 'displayName', 'isMasterAdmin', 'createdAt', 'updatedAt']
        });
    }
    generateStrongPassword() {
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
    async checkSuperAdminRole(userId) {
        const role = await this.userTenantRoleRepo.findOne({
            where: { user: { id: userId }, role: roles_1.TenantRole.SUPER_ADMIN }
        });
        return !!role;
    }
    async getSuperAdminForTenant(tenantId) {
        const tenantRole = await this.userTenantRoleRepo.findOne({
            where: { tenant: { id: tenantId }, role: roles_1.TenantRole.SUPER_ADMIN },
            relations: ['user']
        });
        return (tenantRole === null || tenantRole === void 0 ? void 0 : tenantRole.user) || null;
    }
    async createSuperAdmin(email, displayName, tenantId) {
        if (!email || !email.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        const tenant = await this.clubsRepo.manager.getRepository('tenants').findOne({ where: { id: tenantId } });
        if (!tenant) {
            throw new common_1.NotFoundException('Tenant not found');
        }
        let user = await this.findByEmail(email.trim());
        let isNewUser = false;
        let tempPassword = null;
        if (user) {
            const existingRole = await this.userTenantRoleRepo.findOne({
                where: { user: { id: user.id }, tenant: { id: tenantId }, role: roles_1.TenantRole.SUPER_ADMIN }
            });
            if (existingRole) {
                return {
                    user: {
                        id: user.id,
                        email: user.email,
                        displayName: user.displayName
                    },
                    tempPassword: null,
                    tenantId,
                    isExistingUser: true
                };
            }
            if (displayName && user.displayName !== displayName) {
                user.displayName = displayName;
                await this.usersRepo.save(user);
            }
        }
        else {
            isNewUser = true;
            tempPassword = this.generateStrongPassword();
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
            user = this.usersRepo.create({
                email,
                displayName,
                passwordHash,
                mustResetPassword: true,
                isMasterAdmin: false
            });
            user = await this.usersRepo.save(user);
        }
        const userTenantRole = this.userTenantRoleRepo.create({
            user,
            tenant: { id: tenantId },
            role: roles_1.TenantRole.SUPER_ADMIN
        });
        await this.userTenantRoleRepo.save(userTenantRole);
        return {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName
            },
            tempPassword,
            tenantId,
            isExistingUser: !isNewUser
        };
    }
    async assignTenantRole(userId, tenantId, role) {
        const existing = await this.userTenantRoleRepo.findOne({
            where: { user: { id: userId }, tenant: { id: tenantId }, role }
        });
        if (existing)
            throw new common_1.ConflictException('User already has this role for this tenant');
        const userTenantRole = this.userTenantRoleRepo.create({
            user: { id: userId },
            tenant: { id: tenantId },
            role
        });
        return this.userTenantRoleRepo.save(userTenantRole);
    }
    async removeTenantRole(userId, tenantId, role) {
        const roleRecord = await this.userTenantRoleRepo.findOne({
            where: { user: { id: userId }, tenant: { id: tenantId }, role }
        });
        if (!roleRecord)
            throw new common_1.NotFoundException('Role assignment not found');
        await this.userTenantRoleRepo.remove(roleRecord);
    }
    async getSuperAdminTenants(userId) {
        const roles = await this.userTenantRoleRepo.find({
            where: { user: { id: userId }, role: roles_1.TenantRole.SUPER_ADMIN },
            relations: ['tenant']
        });
        return roles.map((r) => ({
            tenantId: r.tenant.id,
            tenantName: r.tenant.name,
            roleId: r.id
        }));
    }
    async createClubUser(email, displayName, clubId, role) {
        if (!email || !email.trim()) {
            throw new common_1.BadRequestException('Email is required');
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        if (!Object.values(roles_1.ClubRole).includes(role)) {
            throw new common_1.BadRequestException('Invalid club role');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club) {
            throw new common_1.NotFoundException('Club not found');
        }
        let user = await this.findByEmail(email.trim());
        let isNewUser = false;
        let tempPassword = null;
        if (user) {
            const existingClubRoles = await this.userClubRoleRepo.find({
                where: { user: { id: user.id } },
                relations: ['club']
            });
            if (existingClubRoles.length > 0) {
                const userClubId = existingClubRoles[0].club.id;
                if (userClubId !== clubId) {
                    throw new common_1.ConflictException(`User ${email} already belongs to another club. A user can only belong to one club.`);
                }
                const existingRole = existingClubRoles.find(r => r.role === role);
                if (existingRole) {
                    return {
                        user: { id: user.id, email: user.email, displayName: user.displayName },
                        tempPassword: null,
                        clubId,
                        role,
                        isExistingUser: true,
                        roleAlreadyAssigned: true
                    };
                }
            }
            if (displayName && user.displayName !== displayName) {
                user.displayName = displayName;
                await this.usersRepo.save(user);
            }
        }
        else {
            isNewUser = true;
            tempPassword = this.generateStrongPassword();
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(tempPassword, saltRounds);
            user = this.usersRepo.create({
                email,
                displayName,
                passwordHash,
                mustResetPassword: true,
                isMasterAdmin: false
            });
            user = await this.usersRepo.save(user);
        }
        const existingRole = await this.userClubRoleRepo.findOne({
            where: { user: { id: user.id }, club: { id: clubId }, role }
        });
        if (!existingRole) {
            const userClubRole = this.userClubRoleRepo.create({
                user,
                club: { id: clubId },
                role
            });
            await this.userClubRoleRepo.save(userClubRole);
        }
        return {
            user: {
                id: user.id,
                email: user.email,
                displayName: user.displayName
            },
            tempPassword,
            clubId,
            role,
            isExistingUser: !isNewUser,
            roleAlreadyAssigned: !!existingRole
        };
    }
    async getSuperAdminClubs(userId, tenantId) {
        const tenantRoles = await this.userTenantRoleRepo.find({
            where: tenantId
                ? { user: { id: userId }, tenant: { id: tenantId }, role: roles_1.TenantRole.SUPER_ADMIN }
                : { user: { id: userId }, role: roles_1.TenantRole.SUPER_ADMIN },
            relations: ['tenant']
        });
        const clubs = [];
        for (const role of tenantRoles) {
            const tenant = role.tenant;
            const tenantClubs = await this.clubsRepo.find({
                where: { tenant: { id: tenant.id } },
                relations: ['tenant']
            });
            for (const club of tenantClubs) {
                clubs.push({
                    clubId: club.id,
                    clubName: club.name,
                    tenantId: tenant.id,
                    tenantName: tenant.name,
                    description: club.description || undefined,
                    logoUrl: club.logoUrl || undefined
                });
            }
        }
        return clubs;
    }
    async getAdminClubs(userId) {
        var _a, _b;
        const roles = await this.userClubRoleRepo.find({
            where: { user: { id: userId } },
            relations: ['club', 'club.tenant']
        });
        const clubMap = new Map();
        for (const role of roles) {
            const club = role.club;
            const clubId = club.id;
            if (!clubMap.has(clubId)) {
                clubMap.set(clubId, {
                    clubId: club.id,
                    clubName: club.name,
                    tenantId: ((_a = club.tenant) === null || _a === void 0 ? void 0 : _a.id) || '',
                    tenantName: ((_b = club.tenant) === null || _b === void 0 ? void 0 : _b.name) || '',
                    description: club.description || undefined,
                    logoUrl: club.logoUrl || undefined,
                    roles: []
                });
            }
            clubMap.get(clubId).roles.push(role.role);
        }
        return Array.from(clubMap.values());
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(user_club_role_entity_1.UserClubRole)),
    __param(2, (0, typeorm_1.InjectRepository)(user_tenant_role_entity_1.UserTenantRole)),
    __param(3, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], UsersService);
//# sourceMappingURL=users.service.js.map