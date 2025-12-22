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
exports.Staff = exports.StaffStatus = exports.StaffRole = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../club.entity");
var StaffRole;
(function (StaffRole) {
    StaffRole["GRE"] = "GRE";
    StaffRole["DEALER"] = "Dealer";
    StaffRole["CASHIER"] = "Cashier";
    StaffRole["HR"] = "HR";
    StaffRole["MANAGER"] = "Manager";
    StaffRole["FNB"] = "FNB";
})(StaffRole || (exports.StaffRole = StaffRole = {}));
var StaffStatus;
(function (StaffStatus) {
    StaffStatus["ACTIVE"] = "Active";
    StaffStatus["ON_BREAK"] = "On Break";
    StaffStatus["DEACTIVATED"] = "Deactivated";
})(StaffStatus || (exports.StaffStatus = StaffStatus = {}));
let Staff = class Staff {
};
exports.Staff = Staff;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Staff.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Staff.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], Staff.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: StaffStatus.ACTIVE }),
    __metadata("design:type", String)
], Staff.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'employee_id' }),
    __metadata("design:type", Object)
], Staff.prototype, "employeeId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], Staff.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Staff.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Staff.prototype, "updatedAt", void 0);
exports.Staff = Staff = __decorate([
    (0, typeorm_1.Entity)({ name: 'staff' })
], Staff);
//# sourceMappingURL=staff.entity.js.map