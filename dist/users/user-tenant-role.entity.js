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
exports.UserTenantRole = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const tenant_entity_1 = require("../tenants/tenant.entity");
const roles_1 = require("../common/rbac/roles");
let UserTenantRole = class UserTenantRole {
};
exports.UserTenantRole = UserTenantRole;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserTenantRole.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.tenantRoles, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserTenantRole.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, (tenant) => tenant.userRoles, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], UserTenantRole.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], UserTenantRole.prototype, "role", void 0);
exports.UserTenantRole = UserTenantRole = __decorate([
    (0, typeorm_1.Entity)({ name: 'user_tenant_roles' }),
    (0, typeorm_1.Unique)(['user', 'tenant', 'role'])
], UserTenantRole);
//# sourceMappingURL=user-tenant-role.entity.js.map