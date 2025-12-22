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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FnbService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const fnb_order_entity_1 = require("../entities/fnb-order.entity");
const menu_item_entity_1 = require("../entities/menu-item.entity");
const inventory_item_entity_1 = require("../entities/inventory-item.entity");
const supplier_entity_1 = require("../entities/supplier.entity");
const club_entity_1 = require("../club.entity");
let FnbService = class FnbService {
    constructor(orderRepo, menuRepo, inventoryRepo, supplierRepo, clubRepo) {
        this.orderRepo = orderRepo;
        this.menuRepo = menuRepo;
        this.inventoryRepo = inventoryRepo;
        this.supplierRepo = supplierRepo;
        this.clubRepo = clubRepo;
    }
    async createOrder(clubId, dto, createdBy) {
        const club = await this.clubRepo.findOne({ where: { id: clubId } });
        if (!club) {
            throw new common_1.NotFoundException(`Club with ID ${clubId} not found`);
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Order must contain at least one item');
        }
        const calculatedTotal = dto.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        if (Math.abs(calculatedTotal - dto.totalAmount) > 0.01) {
            throw new common_1.BadRequestException('Total amount does not match sum of items');
        }
        const lastOrder = await this.orderRepo.findOne({
            where: { club: { id: clubId } },
            order: { createdAt: 'DESC' }
        });
        const orderNumber = this.generateOrderNumber(lastOrder === null || lastOrder === void 0 ? void 0 : lastOrder.orderNumber);
        const order = this.orderRepo.create({
            ...dto,
            orderNumber,
            club,
            status: fnb_order_entity_1.OrderStatus.PENDING,
            statusHistory: [{
                    status: fnb_order_entity_1.OrderStatus.PENDING,
                    timestamp: new Date(),
                    updatedBy: createdBy || dto.playerName
                }],
            sentToChef: false,
        });
        return await this.orderRepo.save(order);
    }
    async getOrders(clubId, filters) {
        const queryBuilder = this.orderRepo.createQueryBuilder('order')
            .leftJoinAndSelect('order.club', 'club')
            .where('club.id = :clubId', { clubId });
        if (filters === null || filters === void 0 ? void 0 : filters.status) {
            queryBuilder.andWhere('order.status = :status', { status: filters.status });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.tableNumber) {
            queryBuilder.andWhere('LOWER(order.tableNumber) LIKE LOWER(:tableNumber)', {
                tableNumber: `%${filters.tableNumber}%`
            });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.playerId) {
            queryBuilder.andWhere('order.playerId = :playerId', { playerId: filters.playerId });
        }
        if ((filters === null || filters === void 0 ? void 0 : filters.dateFrom) && (filters === null || filters === void 0 ? void 0 : filters.dateTo)) {
            queryBuilder.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom: new Date(filters.dateFrom),
                dateTo: new Date(filters.dateTo)
            });
        }
        else if (filters === null || filters === void 0 ? void 0 : filters.dateFrom) {
            queryBuilder.andWhere('order.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
        }
        else if (filters === null || filters === void 0 ? void 0 : filters.dateTo) {
            queryBuilder.andWhere('order.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
        }
        return await queryBuilder
            .orderBy('order.createdAt', 'DESC')
            .getMany();
    }
    async getOrder(clubId, orderId) {
        const order = await this.orderRepo.findOne({
            where: { id: orderId, club: { id: clubId } },
            relations: ['club']
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with ID ${orderId} not found in club ${clubId}`);
        }
        return order;
    }
    async updateOrderStatus(clubId, orderId, dto, updatedBy) {
        const order = await this.getOrder(clubId, orderId);
        if (dto.status) {
            this.validateStatusTransition(order.status, dto.status);
        }
        if (order.status === fnb_order_entity_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot modify a cancelled order');
        }
        if (order.status === fnb_order_entity_1.OrderStatus.DELIVERED && dto.status !== fnb_order_entity_1.OrderStatus.DELIVERED) {
            throw new common_1.BadRequestException('Cannot change status of a delivered order');
        }
        if (dto.status && dto.status !== order.status) {
            const statusHistory = order.statusHistory || [];
            statusHistory.push({
                status: dto.status,
                timestamp: new Date(),
                updatedBy: updatedBy || dto.processedBy || 'System'
            });
            order.statusHistory = statusHistory;
            order.status = dto.status;
        }
        if (dto.processedBy !== undefined)
            order.processedBy = dto.processedBy;
        if (dto.sentToChef !== undefined)
            order.sentToChef = dto.sentToChef;
        if (dto.chefAssigned !== undefined)
            order.chefAssigned = dto.chefAssigned;
        if (dto.specialInstructions !== undefined)
            order.specialInstructions = dto.specialInstructions;
        return await this.orderRepo.save(order);
    }
    async cancelOrder(clubId, orderId, cancelledBy) {
        const order = await this.getOrder(clubId, orderId);
        if (order.status === fnb_order_entity_1.OrderStatus.DELIVERED) {
            throw new common_1.BadRequestException('Cannot cancel a delivered order');
        }
        if (order.status === fnb_order_entity_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException('Order is already cancelled');
        }
        const statusHistory = order.statusHistory || [];
        statusHistory.push({
            status: fnb_order_entity_1.OrderStatus.CANCELLED,
            timestamp: new Date(),
            updatedBy: cancelledBy || 'System'
        });
        order.status = fnb_order_entity_1.OrderStatus.CANCELLED;
        order.statusHistory = statusHistory;
        return await this.orderRepo.save(order);
    }
    async deleteOrder(clubId, orderId) {
        const order = await this.getOrder(clubId, orderId);
        if (![fnb_order_entity_1.OrderStatus.PENDING, fnb_order_entity_1.OrderStatus.CANCELLED].includes(order.status)) {
            throw new common_1.BadRequestException('Can only delete pending or cancelled orders');
        }
        await this.orderRepo.remove(order);
    }
    async createMenuItem(clubId, dto) {
        var _a, _b;
        const club = await this.clubRepo.findOne({ where: { id: clubId } });
        if (!club) {
            throw new common_1.NotFoundException(`Club with ID ${clubId} not found`);
        }
        const existing = await this.menuRepo.findOne({
            where: {
                club: { id: clubId },
                name: dto.name
            }
        });
        if (existing) {
            throw new common_1.BadRequestException(`Menu item with name "${dto.name}" already exists in this club`);
        }
        if (dto.price < 0) {
            throw new common_1.BadRequestException('Price cannot be negative');
        }
        const menuItem = this.menuRepo.create({
            ...dto,
            club,
            stock: (_a = dto.stock) !== null && _a !== void 0 ? _a : 0,
            isAvailable: (_b = dto.isAvailable) !== null && _b !== void 0 ? _b : true
        });
        return await this.menuRepo.save(menuItem);
    }
    async getMenuItems(clubId, filters) {
        const queryBuilder = this.menuRepo.createQueryBuilder('item')
            .leftJoinAndSelect('item.club', 'club')
            .where('club.id = :clubId', { clubId });
        if (filters === null || filters === void 0 ? void 0 : filters.category) {
            queryBuilder.andWhere('LOWER(item.category) = LOWER(:category)', { category: filters.category });
        }
        if ((filters === null || filters === void 0 ? void 0 : filters.available) !== undefined) {
            queryBuilder.andWhere('item.isAvailable = :available', { available: filters.available });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.search) {
            queryBuilder.andWhere('(LOWER(item.name) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))', { search: `%${filters.search}%` });
        }
        return await queryBuilder
            .orderBy('item.category', 'ASC')
            .addOrderBy('item.name', 'ASC')
            .getMany();
    }
    async getMenuItem(clubId, itemId) {
        const item = await this.menuRepo.findOne({
            where: { id: itemId, club: { id: clubId } },
            relations: ['club']
        });
        if (!item) {
            throw new common_1.NotFoundException(`Menu item with ID ${itemId} not found in club ${clubId}`);
        }
        return item;
    }
    async updateMenuItem(clubId, itemId, dto) {
        const item = await this.getMenuItem(clubId, itemId);
        if (dto.name && dto.name !== item.name) {
            const existing = await this.menuRepo.findOne({
                where: {
                    club: { id: clubId },
                    name: dto.name
                }
            });
            if (existing) {
                throw new common_1.BadRequestException(`Menu item with name "${dto.name}" already exists`);
            }
        }
        if (dto.price !== undefined && dto.price < 0) {
            throw new common_1.BadRequestException('Price cannot be negative');
        }
        if (dto.stock !== undefined && dto.stock < 0) {
            throw new common_1.BadRequestException('Stock cannot be negative');
        }
        Object.assign(item, dto);
        return await this.menuRepo.save(item);
    }
    async deleteMenuItem(clubId, itemId) {
        const item = await this.getMenuItem(clubId, itemId);
        await this.menuRepo.remove(item);
    }
    async getCategories(clubId) {
        const items = await this.menuRepo.find({
            where: { club: { id: clubId } },
            select: ['category']
        });
        const categories = [...new Set(items.map(item => item.category))];
        return categories.sort();
    }
    async createInventoryItem(clubId, dto) {
        const club = await this.clubRepo.findOne({ where: { id: clubId } });
        if (!club) {
            throw new common_1.NotFoundException(`Club with ID ${clubId} not found`);
        }
        const existing = await this.inventoryRepo.findOne({
            where: {
                club: { id: clubId },
                name: dto.name
            }
        });
        if (existing) {
            throw new common_1.BadRequestException(`Inventory item "${dto.name}" already exists`);
        }
        if (dto.currentStock < 0) {
            throw new common_1.BadRequestException('Current stock cannot be negative');
        }
        if (dto.minStock < 0) {
            throw new common_1.BadRequestException('Minimum stock cannot be negative');
        }
        const inventoryItem = this.inventoryRepo.create({
            ...dto,
            club,
            lastRestocked: dto.lastRestocked ? new Date(dto.lastRestocked) : null
        });
        return await this.inventoryRepo.save(inventoryItem);
    }
    async getInventoryItems(clubId, filters) {
        const queryBuilder = this.inventoryRepo.createQueryBuilder('item')
            .leftJoinAndSelect('item.club', 'club')
            .where('club.id = :clubId', { clubId });
        if (filters === null || filters === void 0 ? void 0 : filters.category) {
            queryBuilder.andWhere('LOWER(item.category) = LOWER(:category)', { category: filters.category });
        }
        if (filters === null || filters === void 0 ? void 0 : filters.lowStock) {
            queryBuilder.andWhere('item.currentStock <= item.minStock AND item.currentStock > 0');
        }
        if (filters === null || filters === void 0 ? void 0 : filters.outOfStock) {
            queryBuilder.andWhere('item.currentStock = 0');
        }
        return await queryBuilder
            .orderBy('item.category', 'ASC')
            .addOrderBy('item.name', 'ASC')
            .getMany();
    }
    async getInventoryItem(clubId, itemId) {
        const item = await this.inventoryRepo.findOne({
            where: { id: itemId, club: { id: clubId } },
            relations: ['club']
        });
        if (!item) {
            throw new common_1.NotFoundException(`Inventory item with ID ${itemId} not found in club ${clubId}`);
        }
        return item;
    }
    async updateInventoryItem(clubId, itemId, dto) {
        const item = await this.getInventoryItem(clubId, itemId);
        if (dto.currentStock !== undefined && dto.currentStock < 0) {
            throw new common_1.BadRequestException('Current stock cannot be negative');
        }
        if (dto.minStock !== undefined && dto.minStock < 0) {
            throw new common_1.BadRequestException('Minimum stock cannot be negative');
        }
        if (dto.name && dto.name !== item.name) {
            const existing = await this.inventoryRepo.findOne({
                where: {
                    club: { id: clubId },
                    name: dto.name
                }
            });
            if (existing) {
                throw new common_1.BadRequestException(`Inventory item "${dto.name}" already exists`);
            }
        }
        Object.assign(item, dto);
        if (dto.lastRestocked) {
            item.lastRestocked = new Date(dto.lastRestocked);
        }
        return await this.inventoryRepo.save(item);
    }
    async deleteInventoryItem(clubId, itemId) {
        const item = await this.getInventoryItem(clubId, itemId);
        await this.inventoryRepo.remove(item);
    }
    async getLowStockItems(clubId) {
        return await this.inventoryRepo.createQueryBuilder('item')
            .leftJoinAndSelect('item.club', 'club')
            .where('club.id = :clubId', { clubId })
            .andWhere('item.currentStock <= item.minStock')
            .andWhere('item.currentStock > 0')
            .orderBy('item.currentStock', 'ASC')
            .getMany();
    }
    async getOutOfStockItems(clubId) {
        return await this.inventoryRepo.createQueryBuilder('item')
            .leftJoinAndSelect('item.club', 'club')
            .where('club.id = :clubId', { clubId })
            .andWhere('item.currentStock = 0')
            .getMany();
    }
    async createSupplier(clubId, dto) {
        var _a;
        const club = await this.clubRepo.findOne({ where: { id: clubId } });
        if (!club) {
            throw new common_1.NotFoundException(`Club with ID ${clubId} not found`);
        }
        const existing = await this.supplierRepo.findOne({
            where: {
                club: { id: clubId },
                name: dto.name
            }
        });
        if (existing) {
            throw new common_1.BadRequestException(`Supplier "${dto.name}" already exists`);
        }
        if (dto.rating !== undefined && (dto.rating < 0 || dto.rating > 5)) {
            throw new common_1.BadRequestException('Rating must be between 0 and 5');
        }
        if (dto.email && !this.isValidEmail(dto.email)) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        const supplier = this.supplierRepo.create({
            ...dto,
            club,
            isActive: (_a = dto.isActive) !== null && _a !== void 0 ? _a : true
        });
        return await this.supplierRepo.save(supplier);
    }
    async getSuppliers(clubId, activeOnly) {
        const queryBuilder = this.supplierRepo.createQueryBuilder('supplier')
            .leftJoinAndSelect('supplier.club', 'club')
            .where('club.id = :clubId', { clubId });
        if (activeOnly) {
            queryBuilder.andWhere('supplier.isActive = true');
        }
        return await queryBuilder
            .orderBy('supplier.name', 'ASC')
            .getMany();
    }
    async getSupplier(clubId, supplierId) {
        const supplier = await this.supplierRepo.findOne({
            where: { id: supplierId, club: { id: clubId } },
            relations: ['club']
        });
        if (!supplier) {
            throw new common_1.NotFoundException(`Supplier with ID ${supplierId} not found in club ${clubId}`);
        }
        return supplier;
    }
    async updateSupplier(clubId, supplierId, dto) {
        const supplier = await this.getSupplier(clubId, supplierId);
        if (dto.name && dto.name !== supplier.name) {
            const existing = await this.supplierRepo.findOne({
                where: {
                    club: { id: clubId },
                    name: dto.name
                }
            });
            if (existing) {
                throw new common_1.BadRequestException(`Supplier "${dto.name}" already exists`);
            }
        }
        if (dto.rating !== undefined && (dto.rating < 0 || dto.rating > 5)) {
            throw new common_1.BadRequestException('Rating must be between 0 and 5');
        }
        if (dto.email && !this.isValidEmail(dto.email)) {
            throw new common_1.BadRequestException('Invalid email format');
        }
        Object.assign(supplier, dto);
        return await this.supplierRepo.save(supplier);
    }
    async deleteSupplier(clubId, supplierId) {
        const supplier = await this.getSupplier(clubId, supplierId);
        await this.supplierRepo.remove(supplier);
    }
    async getOrderAnalytics(clubId, dateFrom, dateTo) {
        const queryBuilder = this.orderRepo.createQueryBuilder('order')
            .leftJoin('order.club', 'club')
            .where('club.id = :clubId', { clubId });
        if (dateFrom && dateTo) {
            queryBuilder.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo)
            });
        }
        const orders = await queryBuilder.getMany();
        const totalOrders = orders.length;
        const totalRevenue = orders
            .filter(o => o.status === fnb_order_entity_1.OrderStatus.DELIVERED)
            .reduce((sum, o) => sum + Number(o.totalAmount), 0);
        const statusBreakdown = {
            pending: orders.filter(o => o.status === fnb_order_entity_1.OrderStatus.PENDING).length,
            processing: orders.filter(o => o.status === fnb_order_entity_1.OrderStatus.PROCESSING).length,
            ready: orders.filter(o => o.status === fnb_order_entity_1.OrderStatus.READY).length,
            delivered: orders.filter(o => o.status === fnb_order_entity_1.OrderStatus.DELIVERED).length,
            cancelled: orders.filter(o => o.status === fnb_order_entity_1.OrderStatus.CANCELLED).length,
        };
        const deliveredOrders = orders.filter(o => o.status === fnb_order_entity_1.OrderStatus.DELIVERED);
        const averageOrderValue = deliveredOrders.length > 0
            ? totalRevenue / deliveredOrders.length
            : 0;
        return {
            totalOrders,
            totalRevenue: Number(totalRevenue.toFixed(2)),
            averageOrderValue: Number(averageOrderValue.toFixed(2)),
            statusBreakdown,
            deliveredOrders: deliveredOrders.length,
            cancelledOrders: statusBreakdown.cancelled,
            cancellationRate: totalOrders > 0
                ? Number(((statusBreakdown.cancelled / totalOrders) * 100).toFixed(2))
                : 0
        };
    }
    async getPopularItems(clubId, limit = 10, dateFrom, dateTo) {
        const queryBuilder = this.orderRepo.createQueryBuilder('order')
            .leftJoin('order.club', 'club')
            .where('club.id = :clubId', { clubId })
            .andWhere('order.status = :status', { status: fnb_order_entity_1.OrderStatus.DELIVERED });
        if (dateFrom && dateTo) {
            queryBuilder.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
                dateFrom: new Date(dateFrom),
                dateTo: new Date(dateTo)
            });
        }
        const orders = await queryBuilder.getMany();
        const itemMap = new Map();
        orders.forEach(order => {
            order.items.forEach(item => {
                const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
                existing.quantity += item.quantity;
                existing.revenue += item.price * item.quantity;
                itemMap.set(item.name, existing);
            });
        });
        const popularItems = Array.from(itemMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, limit)
            .map(item => ({
            ...item,
            revenue: Number(item.revenue.toFixed(2))
        }));
        return popularItems;
    }
    generateOrderNumber(lastOrderNumber) {
        if (!lastOrderNumber) {
            return '#0001';
        }
        const num = parseInt(lastOrderNumber.replace('#', '')) + 1;
        return `#${num.toString().padStart(4, '0')}`;
    }
    validateStatusTransition(currentStatus, newStatus) {
        const validTransitions = {
            [fnb_order_entity_1.OrderStatus.PENDING]: [fnb_order_entity_1.OrderStatus.PROCESSING, fnb_order_entity_1.OrderStatus.CANCELLED],
            [fnb_order_entity_1.OrderStatus.PROCESSING]: [fnb_order_entity_1.OrderStatus.READY, fnb_order_entity_1.OrderStatus.CANCELLED],
            [fnb_order_entity_1.OrderStatus.READY]: [fnb_order_entity_1.OrderStatus.DELIVERED, fnb_order_entity_1.OrderStatus.CANCELLED],
            [fnb_order_entity_1.OrderStatus.DELIVERED]: [],
            [fnb_order_entity_1.OrderStatus.CANCELLED]: [],
        };
        if (!validTransitions[currentStatus].includes(newStatus)) {
            throw new common_1.BadRequestException(`Invalid status transition from ${currentStatus} to ${newStatus}`);
        }
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};
exports.FnbService = FnbService;
exports.FnbService = FnbService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(fnb_order_entity_1.FnbOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(menu_item_entity_1.MenuItem)),
    __param(2, (0, typeorm_1.InjectRepository)(inventory_item_entity_1.InventoryItem)),
    __param(3, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __param(4, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], FnbService);
//# sourceMappingURL=fnb.service.js.map