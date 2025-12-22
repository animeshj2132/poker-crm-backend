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
exports.WaitlistEntry = exports.WaitlistStatus = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../club.entity");
var WaitlistStatus;
(function (WaitlistStatus) {
    WaitlistStatus["PENDING"] = "PENDING";
    WaitlistStatus["SEATED"] = "SEATED";
    WaitlistStatus["CANCELLED"] = "CANCELLED";
    WaitlistStatus["NO_SHOW"] = "NO_SHOW";
})(WaitlistStatus || (exports.WaitlistStatus = WaitlistStatus = {}));
let WaitlistEntry = class WaitlistEntry {
};
exports.WaitlistEntry = WaitlistEntry;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], WaitlistEntry.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], WaitlistEntry.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'player_name' }),
    __metadata("design:type", String)
], WaitlistEntry.prototype, "playerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'player_id' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "playerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'phone_number' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "phoneNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1, name: 'party_size' }),
    __metadata("design:type", Number)
], WaitlistEntry.prototype, "partySize", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: WaitlistStatus.PENDING }),
    __metadata("design:type", String)
], WaitlistEntry.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, name: 'table_number' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "tableNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'table_type' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "tableType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], WaitlistEntry.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'seated_at' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "seatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true, name: 'cancelled_at' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'seated_by' }),
    __metadata("design:type", Object)
], WaitlistEntry.prototype, "seatedBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], WaitlistEntry.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], WaitlistEntry.prototype, "updatedAt", void 0);
exports.WaitlistEntry = WaitlistEntry = __decorate([
    (0, typeorm_1.Entity)({ name: 'waitlist_entries' })
], WaitlistEntry);
//# sourceMappingURL=waitlist-entry.entity.js.map