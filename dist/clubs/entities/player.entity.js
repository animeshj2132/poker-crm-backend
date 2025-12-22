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
exports.Player = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../club.entity");
const affiliate_entity_1 = require("./affiliate.entity");
let Player = class Player {
};
exports.Player = Player;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Player.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], Player.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => affiliate_entity_1.Affiliate, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: 'affiliate_id' }),
    __metadata("design:type", Object)
], Player.prototype, "affiliate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200 }),
    __metadata("design:type", String)
], Player.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true, name: 'phone_number' }),
    __metadata("design:type", Object)
], Player.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true, name: 'player_id' }),
    __metadata("design:type", Object)
], Player.prototype, "playerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_spent' }),
    __metadata("design:type", Number)
], Player.prototype, "totalSpent", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_commission' }),
    __metadata("design:type", Number)
], Player.prototype, "totalCommission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'Active' }),
    __metadata("design:type", String)
], Player.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: 'pending', name: 'kyc_status' }),
    __metadata("design:type", String)
], Player.prototype, "kycStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'kyc_approved_at' }),
    __metadata("design:type", Object)
], Player.prototype, "kycApprovedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'kyc_approved_by' }),
    __metadata("design:type", Object)
], Player.prototype, "kycApprovedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'jsonb', nullable: true, name: 'kyc_documents' }),
    __metadata("design:type", Object)
], Player.prototype, "kycDocuments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Player.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'password_hash' }),
    __metadata("design:type", Object)
], Player.prototype, "passwordHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", Object)
], Player.prototype, "nickname", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'credit_enabled' }),
    __metadata("design:type", Boolean)
], Player.prototype, "creditEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'credit_limit' }),
    __metadata("design:type", Number)
], Player.prototype, "creditLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true, name: 'credit_enabled_by' }),
    __metadata("design:type", Object)
], Player.prototype, "creditEnabledBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'credit_enabled_at' }),
    __metadata("design:type", Object)
], Player.prototype, "creditEnabledAt", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Player.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Player.prototype, "updatedAt", void 0);
exports.Player = Player = __decorate([
    (0, typeorm_1.Entity)({ name: 'players' }),
    (0, typeorm_1.Index)(['club', 'email'], { unique: true }),
    (0, typeorm_1.Index)(['affiliate'])
], Player);
//# sourceMappingURL=player.entity.js.map