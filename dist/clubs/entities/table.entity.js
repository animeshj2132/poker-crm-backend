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
exports.Table = exports.TableType = exports.TableStatus = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../club.entity");
var TableStatus;
(function (TableStatus) {
    TableStatus["AVAILABLE"] = "AVAILABLE";
    TableStatus["OCCUPIED"] = "OCCUPIED";
    TableStatus["RESERVED"] = "RESERVED";
    TableStatus["MAINTENANCE"] = "MAINTENANCE";
    TableStatus["CLOSED"] = "CLOSED";
})(TableStatus || (exports.TableStatus = TableStatus = {}));
var TableType;
(function (TableType) {
    TableType["CASH"] = "CASH";
    TableType["TOURNAMENT"] = "TOURNAMENT";
    TableType["HIGH_STAKES"] = "HIGH_STAKES";
    TableType["PRIVATE"] = "PRIVATE";
})(TableType || (exports.TableType = TableType = {}));
let Table = class Table {
};
exports.Table = Table;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Table.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], Table.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_number', type: 'int' }),
    __metadata("design:type", Number)
], Table.prototype, "tableNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'table_type', type: 'varchar' }),
    __metadata("design:type", String)
], Table.prototype, "tableType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_seats', type: 'int' }),
    __metadata("design:type", Number)
], Table.prototype, "maxSeats", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_seats', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Table.prototype, "currentSeats", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: TableStatus.AVAILABLE }),
    __metadata("design:type", String)
], Table.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_buy_in', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Table.prototype, "minBuyIn", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_buy_in', type: 'decimal', precision: 10, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], Table.prototype, "maxBuyIn", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Table.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_for', type: 'varchar', nullable: true }),
    __metadata("design:type", Object)
], Table.prototype, "reservedFor", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_until', type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], Table.prototype, "reservedUntil", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Table.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Table.prototype, "updatedAt", void 0);
exports.Table = Table = __decorate([
    (0, typeorm_1.Entity)({ name: 'tables' })
], Table);
//# sourceMappingURL=table.entity.js.map