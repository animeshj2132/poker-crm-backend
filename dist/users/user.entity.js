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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const typeorm_1 = require("typeorm");
const user_tenant_role_entity_1 = require("./user-tenant-role.entity");
const user_club_role_entity_1 = require("./user-club-role.entity");
let User = class User {
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'display_name' }),
    __metadata("design:type", Object)
], User.prototype, "displayName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, select: false, name: 'password_hash' }),
    __metadata("design:type", Object)
], User.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'must_reset_password' }),
    __metadata("design:type", Boolean)
], User.prototype, "mustResetPassword", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false, name: 'is_master_admin' }),
    __metadata("design:type", Boolean)
], User.prototype, "isMasterAdmin", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_tenant_role_entity_1.UserTenantRole, (utr) => utr.user),
    __metadata("design:type", Array)
], User.prototype, "tenantRoles", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_club_role_entity_1.UserClubRole, (ucr) => ucr.user),
    __metadata("design:type", Array)
], User.prototype, "clubRoles", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)({ name: 'users_v1' })
], User);
//# sourceMappingURL=user.entity.js.map