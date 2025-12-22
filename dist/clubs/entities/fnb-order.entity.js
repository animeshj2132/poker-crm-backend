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
exports.FnbOrder = exports.OrderStatus = void 0;
const typeorm_1 = require("typeorm");
const club_entity_1 = require("../club.entity");
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["READY"] = "ready";
    OrderStatus["DELIVERED"] = "delivered";
    OrderStatus["CANCELLED"] = "cancelled";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
let FnbOrder = class FnbOrder {
};
exports.FnbOrder = FnbOrder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], FnbOrder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'order_number' }),
    __metadata("design:type", String)
], FnbOrder.prototype, "orderNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'player_name' }),
    __metadata("design:type", String)
], FnbOrder.prototype, "playerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'player_id', nullable: true }),
    __metadata("design:type", Object)
], FnbOrder.prototype, "playerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', name: 'table_number' }),
    __metadata("design:type", String)
], FnbOrder.prototype, "tableNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Array)
], FnbOrder.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' }),
    __metadata("design:type", Number)
], FnbOrder.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', default: OrderStatus.PENDING }),
    __metadata("design:type", String)
], FnbOrder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, name: 'special_instructions' }),
    __metadata("design:type", Object)
], FnbOrder.prototype, "specialInstructions", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'processed_by' }),
    __metadata("design:type", Object)
], FnbOrder.prototype, "processedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, name: 'sent_to_chef' }),
    __metadata("design:type", Boolean)
], FnbOrder.prototype, "sentToChef", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', nullable: true, name: 'chef_assigned' }),
    __metadata("design:type", Object)
], FnbOrder.prototype, "chefAssigned", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, name: 'status_history' }),
    __metadata("design:type", Object)
], FnbOrder.prototype, "statusHistory", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], FnbOrder.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], FnbOrder.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], FnbOrder.prototype, "updatedAt", void 0);
exports.FnbOrder = FnbOrder = __decorate([
    (0, typeorm_1.Entity)({ name: 'fnb_orders' })
], FnbOrder);
//# sourceMappingURL=fnb-order.entity.js.map