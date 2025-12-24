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
exports.Club = void 0;
const typeorm_1 = require("typeorm");
const tenant_entity_1 = require("../tenants/tenant.entity");
const user_club_role_entity_1 = require("../users/user-club-role.entity");
let Club = class Club {
};
exports.Club = Club;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Club.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Club.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Club.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'logo_url' }),
    __metadata("design:type", Object)
], Club.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'video_url' }),
    __metadata("design:type", Object)
], Club.prototype, "videoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'skin_color' }),
    __metadata("design:type", Object)
], Club.prototype, "skinColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'gradient' }),
    __metadata("design:type", Object)
], Club.prototype, "gradient", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 6, unique: true, nullable: true }),
    __metadata("design:type", Object)
], Club.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active' }),
    __metadata("design:type", String)
], Club.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'terms_and_conditions' }),
    __metadata("design:type", Object)
], Club.prototype, "termsAndConditions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'subscription_price' }),
    __metadata("design:type", Number)
], Club.prototype, "subscriptionPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'active', name: 'subscription_status' }),
    __metadata("design:type", String)
], Club.prototype, "subscriptionStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'last_payment_date' }),
    __metadata("design:type", Object)
], Club.prototype, "lastPaymentDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'subscription_notes' }),
    __metadata("design:type", Object)
], Club.prototype, "subscriptionNotes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => tenant_entity_1.Tenant, (tenant) => tenant.clubs, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'tenant_id' }),
    __metadata("design:type", tenant_entity_1.Tenant)
], Club.prototype, "tenant", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Club.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Club.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_club_role_entity_1.UserClubRole, (ucr) => ucr.club),
    __metadata("design:type", Array)
], Club.prototype, "userRoles", void 0);
exports.Club = Club = __decorate([
    (0, typeorm_1.Entity)({ name: 'clubs' })
], Club);
//# sourceMappingURL=club.entity.js.map