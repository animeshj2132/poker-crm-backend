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
exports.Affiliate = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../club.entity");
const user_entity_1 = require("../../users/user.entity");
const player_entity_1 = require("./player.entity");
let Affiliate = class Affiliate {
};
exports.Affiliate = Affiliate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Affiliate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], Affiliate.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], Affiliate.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', unique: true, length: 20 }),
    __metadata("design:type", String)
], Affiliate.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", Object)
], Affiliate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 2, default: 5.0, name: 'commission_rate' }),
    __metadata("design:type", Number)
], Affiliate.prototype, "commissionRate", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: 'Active' }),
    __metadata("design:type", String)
], Affiliate.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0, name: 'total_commission' }),
    __metadata("design:type", Number)
], Affiliate.prototype, "totalCommission", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, name: 'total_referrals' }),
    __metadata("design:type", Number)
], Affiliate.prototype, "totalReferrals", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => player_entity_1.Player, player => player.affiliate),
    __metadata("design:type", Array)
], Affiliate.prototype, "players", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Affiliate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Affiliate.prototype, "updatedAt", void 0);
exports.Affiliate = Affiliate = __decorate([
    (0, typeorm_1.Entity)({ name: 'affiliates' }),
    (0, typeorm_1.Index)(['club', 'code'], { unique: true }),
    (0, typeorm_1.Index)(['club', 'user'], { unique: true })
], Affiliate);
//# sourceMappingURL=affiliate.entity.js.map