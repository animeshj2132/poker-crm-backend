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
exports.Tenant = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../clubs/club.entity");
const user_tenant_role_entity_1 = require("../users/user-tenant-role.entity");
let Tenant = class Tenant {
};
exports.Tenant = Tenant;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Tenant.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], Tenant.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'branding_json' }),
    __metadata("design:type", Object)
], Tenant.prototype, "brandingJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'logo_url' }),
    __metadata("design:type", Object)
], Tenant.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'favicon_url' }),
    __metadata("design:type", Object)
], Tenant.prototype, "faviconUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'primary_color' }),
    __metadata("design:type", Object)
], Tenant.prototype, "primaryColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'secondary_color' }),
    __metadata("design:type", Object)
], Tenant.prototype, "secondaryColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true }),
    __metadata("design:type", Object)
], Tenant.prototype, "theme", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'custom_domain' }),
    __metadata("design:type", Object)
], Tenant.prototype, "customDomain", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true, name: 'white_label' }),
    __metadata("design:type", Boolean)
], Tenant.prototype, "whiteLabel", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Tenant.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Tenant.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => club_entity_1.Club, (club) => club.tenant),
    __metadata("design:type", Array)
], Tenant.prototype, "clubs", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_tenant_role_entity_1.UserTenantRole, (utr) => utr.tenant),
    __metadata("design:type", Array)
], Tenant.prototype, "userRoles", void 0);
exports.Tenant = Tenant = __decorate([
    (0, typeorm_1.Entity)({ name: 'tenants' })
], Tenant);
//# sourceMappingURL=tenant.entity.js.map