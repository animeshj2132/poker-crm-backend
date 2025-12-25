import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { FnbOrder, OrderStatus, StatusHistoryEntry } from '../entities/fnb-order.entity';
import { MenuItem, MenuItemAvailability } from '../entities/menu-item.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { Club } from '../club.entity';
import { CreateFnbOrderDto } from '../dto/create-fnb-order.dto';
import { UpdateFnbOrderDto } from '../dto/update-fnb-order.dto';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../dto/update-inventory-item.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';

@Injectable()
export class FnbService {
  constructor(
    @InjectRepository(FnbOrder)
    private readonly orderRepo: Repository<FnbOrder>,
    @InjectRepository(MenuItem)
    private readonly menuRepo: Repository<MenuItem>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
  ) {}

  // ==================== ORDERS ====================

  async createOrder(clubId: string, dto: CreateFnbOrderDto, createdBy?: string): Promise<FnbOrder> {
    // Validate club exists
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Validate items array is not empty
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Validate total amount matches items
    const calculatedTotal = dto.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (Math.abs(calculatedTotal - dto.totalAmount) > 0.01) {
      throw new BadRequestException('Total amount does not match sum of items');
    }

    // Order number will be assigned later when accepted
    // Create order
    const order = this.orderRepo.create({
      ...dto,
      orderNumber: null, // Will be assigned when accepted
      club,
      status: OrderStatus.PENDING,
      statusHistory: [{
        status: OrderStatus.PENDING,
        timestamp: new Date(),
        updatedBy: createdBy || dto.playerName
      }],
      sentToChef: false,
    });

    return await this.orderRepo.save(order);
  }

  async getOrders(clubId: string, filters?: {
    status?: OrderStatus;
    tableNumber?: string;
    playerId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<FnbOrder[]> {
    const queryBuilder = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.club', 'club')
      .where('club.id = :clubId', { clubId });

    // Apply filters with edge case handling
    if (filters?.status) {
      queryBuilder.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.tableNumber) {
      queryBuilder.andWhere('LOWER(order.tableNumber) LIKE LOWER(:tableNumber)', { 
        tableNumber: `%${filters.tableNumber}%` 
      });
    }

    if (filters?.playerId) {
      queryBuilder.andWhere('order.playerId = :playerId', { playerId: filters.playerId });
    }

    if (filters?.dateFrom && filters?.dateTo) {
      queryBuilder.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(filters.dateFrom),
        dateTo: new Date(filters.dateTo)
      });
    } else if (filters?.dateFrom) {
      queryBuilder.andWhere('order.createdAt >= :dateFrom', { dateFrom: new Date(filters.dateFrom) });
    } else if (filters?.dateTo) {
      queryBuilder.andWhere('order.createdAt <= :dateTo', { dateTo: new Date(filters.dateTo) });
    }

    return await queryBuilder
      .orderBy('order.createdAt', 'DESC')
      .getMany();
  }

  async getOrder(clubId: string, orderId: string): Promise<FnbOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, club: { id: clubId } },
      relations: ['club']
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found in club ${clubId}`);
    }

    return order;
  }

  async updateOrderStatus(
    clubId: string, 
    orderId: string, 
    dto: UpdateFnbOrderDto,
    updatedBy?: string
  ): Promise<FnbOrder> {
    const order = await this.getOrder(clubId, orderId);

    // Validate status transition
    if (dto.status) {
      this.validateStatusTransition(order.status, dto.status);
    }

    // Edge case: Cannot modify cancelled or delivered orders
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot modify a cancelled order');
    }
    if (order.status === OrderStatus.DELIVERED && dto.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot change status of a delivered order');
    }

    // Update status history
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

    // Update other fields
    if (dto.processedBy !== undefined) order.processedBy = dto.processedBy;
    if (dto.sentToChef !== undefined) order.sentToChef = dto.sentToChef;
    if (dto.chefAssigned !== undefined) order.chefAssigned = dto.chefAssigned;
    if (dto.specialInstructions !== undefined) order.specialInstructions = dto.specialInstructions;

    return await this.orderRepo.save(order);
  }

  async cancelOrder(clubId: string, orderId: string, cancelledBy?: string): Promise<FnbOrder> {
    const order = await this.getOrder(clubId, orderId);

    // Edge case: Cannot cancel delivered orders
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered order');
    }

    // Edge case: Already cancelled
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    const statusHistory = order.statusHistory || [];
    statusHistory.push({
      status: OrderStatus.CANCELLED,
      timestamp: new Date(),
      updatedBy: cancelledBy || 'System'
    });

    order.status = OrderStatus.CANCELLED;
    order.statusHistory = statusHistory;

    return await this.orderRepo.save(order);
  }

  async deleteOrder(clubId: string, orderId: string): Promise<void> {
    const order = await this.getOrder(clubId, orderId);

    // Edge case: Only allow deletion of pending or cancelled orders
    if (![OrderStatus.PENDING, OrderStatus.CANCELLED].includes(order.status)) {
      throw new BadRequestException('Can only delete pending or cancelled orders');
    }

    await this.orderRepo.remove(order);
  }

  // ==================== MENU ITEMS ====================

  async createMenuItem(clubId: string, dto: CreateMenuItemDto): Promise<MenuItem> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Edge case: Check for duplicate menu item names
    const existing = await this.menuRepo.findOne({
      where: { 
        club: { id: clubId },
        name: dto.name 
      }
    });

    if (existing) {
      throw new BadRequestException(`Menu item with name "${dto.name}" already exists in this club`);
    }

    // Edge case: Validate price is positive
    if (dto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    const menuItem = this.menuRepo.create({
      ...dto,
      club,
      stock: dto.stock ?? 0,
      availability: dto.availability || MenuItemAvailability.AVAILABLE
    });

    return await this.menuRepo.save(menuItem);
  }

  async getMenuItems(clubId: string, filters?: {
    category?: string;
    available?: boolean;
    search?: string;
  }): Promise<MenuItem[]> {
    const queryBuilder = this.menuRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.club', 'club')
      .where('club.id = :clubId', { clubId });

    if (filters?.category) {
      queryBuilder.andWhere('LOWER(item.category) = LOWER(:category)', { category: filters.category });
    }

    if (filters?.available !== undefined) {
      queryBuilder.andWhere('item.isAvailable = :available', { available: filters.available });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(LOWER(item.name) LIKE LOWER(:search) OR LOWER(item.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    return await queryBuilder
      .orderBy('item.category', 'ASC')
      .addOrderBy('item.name', 'ASC')
      .getMany();
  }

  async getMenuItem(clubId: string, itemId: string): Promise<MenuItem> {
    const item = await this.menuRepo.findOne({
      where: { id: itemId, club: { id: clubId } },
      relations: ['club']
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${itemId} not found in club ${clubId}`);
    }

    return item;
  }

  async updateMenuItem(clubId: string, itemId: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.getMenuItem(clubId, itemId);

    // Edge case: Check for duplicate name if changing name
    if (dto.name && dto.name !== item.name) {
      const existing = await this.menuRepo.findOne({
        where: { 
          club: { id: clubId },
          name: dto.name 
        }
      });

      if (existing) {
        throw new BadRequestException(`Menu item with name "${dto.name}" already exists`);
      }
    }

    // Edge case: Validate price if changing
    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Price cannot be negative');
    }

    // Edge case: Validate stock if changing
    if (dto.stock !== undefined && dto.stock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    Object.assign(item, dto);
    return await this.menuRepo.save(item);
  }

  async deleteMenuItem(clubId: string, itemId: string): Promise<void> {
    const item = await this.getMenuItem(clubId, itemId);
    await this.menuRepo.remove(item);
  }

  async getCategories(clubId: string): Promise<string[]> {
    const items = await this.menuRepo.find({
      where: { club: { id: clubId } },
      select: ['category']
    });

    const categories = [...new Set(items.map(item => item.category))];
    return categories.sort();
  }

  // ==================== INVENTORY ====================

  async createInventoryItem(clubId: string, dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Edge case: Check for duplicate inventory item
    const existing = await this.inventoryRepo.findOne({
      where: { 
        club: { id: clubId },
        name: dto.name 
      }
    });

    if (existing) {
      throw new BadRequestException(`Inventory item "${dto.name}" already exists`);
    }

    // Edge case: Validate stock values
    if (dto.currentStock < 0) {
      throw new BadRequestException('Current stock cannot be negative');
    }
    if (dto.minStock < 0) {
      throw new BadRequestException('Minimum stock cannot be negative');
    }

    const inventoryItem = this.inventoryRepo.create({
      ...dto,
      club,
      lastRestocked: dto.lastRestocked ? new Date(dto.lastRestocked) : null
    });

    return await this.inventoryRepo.save(inventoryItem);
  }

  async getInventoryItems(clubId: string, filters?: {
    category?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
  }): Promise<InventoryItem[]> {
    const queryBuilder = this.inventoryRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.club', 'club')
      .where('club.id = :clubId', { clubId });

    if (filters?.category) {
      queryBuilder.andWhere('LOWER(item.category) = LOWER(:category)', { category: filters.category });
    }

    if (filters?.lowStock) {
      queryBuilder.andWhere('item.currentStock <= item.minStock AND item.currentStock > 0');
    }

    if (filters?.outOfStock) {
      queryBuilder.andWhere('item.currentStock = 0');
    }

    return await queryBuilder
      .orderBy('item.category', 'ASC')
      .addOrderBy('item.name', 'ASC')
      .getMany();
  }

  async getInventoryItem(clubId: string, itemId: string): Promise<InventoryItem> {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, club: { id: clubId } },
      relations: ['club']
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found in club ${clubId}`);
    }

    return item;
  }

  async updateInventoryItem(clubId: string, itemId: string, dto: UpdateInventoryItemDto): Promise<InventoryItem> {
    const item = await this.getInventoryItem(clubId, itemId);

    // Edge case: Validate stock values
    if (dto.currentStock !== undefined && dto.currentStock < 0) {
      throw new BadRequestException('Current stock cannot be negative');
    }
    if (dto.minStock !== undefined && dto.minStock < 0) {
      throw new BadRequestException('Minimum stock cannot be negative');
    }

    // Edge case: Check for duplicate name if changing
    if (dto.name && dto.name !== item.name) {
      const existing = await this.inventoryRepo.findOne({
        where: { 
          club: { id: clubId },
          name: dto.name 
        }
      });

      if (existing) {
        throw new BadRequestException(`Inventory item "${dto.name}" already exists`);
      }
    }

    Object.assign(item, dto);
    if (dto.lastRestocked) {
      item.lastRestocked = new Date(dto.lastRestocked);
    }

    return await this.inventoryRepo.save(item);
  }

  async deleteInventoryItem(clubId: string, itemId: string): Promise<void> {
    const item = await this.getInventoryItem(clubId, itemId);
    await this.inventoryRepo.remove(item);
  }

  async getLowStockItems(clubId: string): Promise<InventoryItem[]> {
    return await this.inventoryRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.club', 'club')
      .where('club.id = :clubId', { clubId })
      .andWhere('item.currentStock <= item.minStock')
      .andWhere('item.currentStock > 0')
      .orderBy('item.currentStock', 'ASC')
      .getMany();
  }

  async getOutOfStockItems(clubId: string): Promise<InventoryItem[]> {
    return await this.inventoryRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.club', 'club')
      .where('club.id = :clubId', { clubId })
      .andWhere('item.currentStock = 0')
      .getMany();
  }

  // ==================== SUPPLIERS ====================

  async createSupplier(clubId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Edge case: Check for duplicate supplier name
    const existing = await this.supplierRepo.findOne({
      where: { 
        club: { id: clubId },
        name: dto.name 
      }
    });

    if (existing) {
      throw new BadRequestException(`Supplier "${dto.name}" already exists`);
    }

    // Edge case: Validate rating if provided
    if (dto.rating !== undefined && (dto.rating < 0 || dto.rating > 5)) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    // Edge case: Validate email format (additional check)
    if (dto.email && !this.isValidEmail(dto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    const supplier = this.supplierRepo.create({
      ...dto,
      club,
      isActive: dto.isActive ?? true
    });

    return await this.supplierRepo.save(supplier);
  }

  async getSuppliers(clubId: string, activeOnly?: boolean): Promise<Supplier[]> {
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

  async getSupplier(clubId: string, supplierId: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId, club: { id: clubId } },
      relations: ['club']
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found in club ${clubId}`);
    }

    return supplier;
  }

  async updateSupplier(clubId: string, supplierId: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.getSupplier(clubId, supplierId);

    // Edge case: Check for duplicate name if changing
    if (dto.name && dto.name !== supplier.name) {
      const existing = await this.supplierRepo.findOne({
        where: { 
          club: { id: clubId },
          name: dto.name 
        }
      });

      if (existing) {
        throw new BadRequestException(`Supplier "${dto.name}" already exists`);
      }
    }

    // Edge case: Validate rating if changing
    if (dto.rating !== undefined && (dto.rating < 0 || dto.rating > 5)) {
      throw new BadRequestException('Rating must be between 0 and 5');
    }

    // Edge case: Validate email if changing
    if (dto.email && !this.isValidEmail(dto.email)) {
      throw new BadRequestException('Invalid email format');
    }

    Object.assign(supplier, dto);
    return await this.supplierRepo.save(supplier);
  }

  async deleteSupplier(clubId: string, supplierId: string): Promise<void> {
    const supplier = await this.getSupplier(clubId, supplierId);
    await this.supplierRepo.remove(supplier);
  }

  // ==================== ANALYTICS ====================

  async getOrderAnalytics(clubId: string, dateFrom?: string, dateTo?: string) {
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

    // Calculate analytics with edge cases
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(o => o.status === OrderStatus.DELIVERED)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);
    
    const statusBreakdown = {
      pending: orders.filter(o => o.status === OrderStatus.PENDING).length,
      processing: orders.filter(o => o.status === OrderStatus.PROCESSING).length,
      ready: orders.filter(o => o.status === OrderStatus.READY).length,
      delivered: orders.filter(o => o.status === OrderStatus.DELIVERED).length,
      cancelled: orders.filter(o => o.status === OrderStatus.CANCELLED).length,
    };

    // Average order value (edge case: avoid division by zero)
    const deliveredOrders = orders.filter(o => o.status === OrderStatus.DELIVERED);
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

  async getPopularItems(clubId: string, limit: number = 10, dateFrom?: string, dateTo?: string) {
    const queryBuilder = this.orderRepo.createQueryBuilder('order')
      .leftJoin('order.club', 'club')
      .where('club.id = :clubId', { clubId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED });

    if (dateFrom && dateTo) {
      queryBuilder.andWhere('order.createdAt BETWEEN :dateFrom AND :dateTo', {
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo)
      });
    }

    const orders = await queryBuilder.getMany();

    // Aggregate items
    const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity;
        existing.revenue += item.price * item.quantity;
        itemMap.set(item.name, existing);
      });
    });

    // Convert to array and sort
    const popularItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit)
      .map(item => ({
        ...item,
        revenue: Number(item.revenue.toFixed(2))
      }));

    return popularItems;
  }

  // ==================== HELPER METHODS ====================

  private generateOrderNumber(lastOrderNumber?: string): string {
    if (!lastOrderNumber) {
      return '#0001';
    }

    const num = parseInt(lastOrderNumber.replace('#', '')) + 1;
    return `#${num.toString().padStart(4, '0')}`;
  }

  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

