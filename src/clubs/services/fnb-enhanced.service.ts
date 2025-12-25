import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, Not, IsNull, LessThan } from 'typeorm';
import { FnbOrder, OrderStatus } from '../entities/fnb-order.entity';
import { MenuItem, MenuItemAvailability } from '../entities/menu-item.entity';
import { KitchenStation } from '../entities/kitchen-station.entity';
import { MenuCategory } from '../entities/menu-category.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { Club } from '../club.entity';
import { CreateKitchenStationDto } from '../dto/create-kitchen-station.dto';
import { UpdateKitchenStationDto } from '../dto/update-kitchen-station.dto';
import { AcceptRejectOrderDto } from '../dto/accept-reject-order.dto';
import { CreateMenuItemDto } from '../dto/create-menu-item.dto';
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from '../dto/update-inventory-item.dto';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { CreateFnbOrderDto } from '../dto/create-fnb-order.dto';
import { UpdateFnbOrderDto } from '../dto/update-fnb-order.dto';

/**
 * Enhanced FNB Service with Kitchen Station and Advanced Order Management
 * This service extends the base FNB functionality
 */
@Injectable()
export class FnbEnhancedService {
  constructor(
    @InjectRepository(FnbOrder)
    private readonly orderRepo: Repository<FnbOrder>,
    @InjectRepository(MenuItem)
    private readonly menuRepo: Repository<MenuItem>,
    @InjectRepository(KitchenStation)
    private readonly stationRepo: Repository<KitchenStation>,
    @InjectRepository(MenuCategory)
    private readonly categoryRepo: Repository<MenuCategory>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
  ) {}

  // ==================== MENU ITEMS ====================

  async createMenuItem(clubId: string, dto: CreateMenuItemDto): Promise<MenuItem> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    const menuItem = this.menuRepo.create({
      ...dto,
      club,
      availability: dto.availability || MenuItemAvailability.AVAILABLE
    });

    return await this.menuRepo.save(menuItem);
  }

  async getMenuItems(clubId: string): Promise<MenuItem[]> {
    return await this.menuRepo.find({
      where: { club: { id: clubId } },
      order: { category: 'ASC', name: 'ASC' }
    });
  }

  async getMenuItem(clubId: string, itemId: string): Promise<MenuItem> {
    const item = await this.menuRepo.findOne({
      where: { id: itemId, club: { id: clubId } },
      relations: ['club']
    });

    if (!item) {
      throw new NotFoundException(`Menu item with ID ${itemId} not found`);
    }

    return item;
  }

  async updateMenuItem(clubId: string, itemId: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.getMenuItem(clubId, itemId);
    Object.assign(item, dto);
    return await this.menuRepo.save(item);
  }

  async deleteMenuItem(clubId: string, itemId: string): Promise<void> {
    const item = await this.getMenuItem(clubId, itemId);
    await this.menuRepo.remove(item);
  }

  // ==================== INVENTORY ====================

  async createInventoryItem(clubId: string, dto: CreateInventoryItemDto): Promise<InventoryItem> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    const inventoryItem = this.inventoryRepo.create({
      ...dto,
      club
    });

    return await this.inventoryRepo.save(inventoryItem);
  }

  async getInventoryItems(clubId: string, lowStockOnly = false): Promise<InventoryItem[]> {
    const query = this.inventoryRepo.createQueryBuilder('item')
      .leftJoinAndSelect('item.club', 'club')
      .where('club.id = :clubId', { clubId });

    if (lowStockOnly) {
      query.andWhere('item.currentStock <= item.criticalLevel');
    }

    return await query
      .orderBy('item.name', 'ASC')
      .getMany();
  }

  async getInventoryItem(clubId: string, itemId: string): Promise<InventoryItem> {
    const item = await this.inventoryRepo.findOne({
      where: { id: itemId, club: { id: clubId } },
      relations: ['club']
    });

    if (!item) {
      throw new NotFoundException(`Inventory item with ID ${itemId} not found`);
    }

    return item;
  }

  async updateInventoryItem(clubId: string, itemId: string, dto: UpdateInventoryItemDto): Promise<InventoryItem> {
    const item = await this.getInventoryItem(clubId, itemId);
    Object.assign(item, dto);
    return await this.inventoryRepo.save(item);
  }

  async deleteInventoryItem(clubId: string, itemId: string): Promise<void> {
    const item = await this.getInventoryItem(clubId, itemId);
    await this.inventoryRepo.remove(item);
  }

  // ==================== SUPPLIERS ====================

  async createSupplier(clubId: string, dto: CreateSupplierDto): Promise<Supplier> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    const supplier = this.supplierRepo.create({
      ...dto,
      club
    });

    return await this.supplierRepo.save(supplier);
  }

  async getSuppliers(clubId: string): Promise<Supplier[]> {
    return await this.supplierRepo.find({
      where: { club: { id: clubId } },
      order: { name: 'ASC' }
    });
  }

  async getSupplier(clubId: string, supplierId: string): Promise<Supplier> {
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId, club: { id: clubId } },
      relations: ['club']
    });

    if (!supplier) {
      throw new NotFoundException(`Supplier with ID ${supplierId} not found`);
    }

    return supplier;
  }

  async updateSupplier(clubId: string, supplierId: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.getSupplier(clubId, supplierId);
    Object.assign(supplier, dto);
    return await this.supplierRepo.save(supplier);
  }

  async deleteSupplier(clubId: string, supplierId: string): Promise<void> {
    const supplier = await this.getSupplier(clubId, supplierId);
    await this.supplierRepo.remove(supplier);
  }

  // ==================== ORDERS ====================

  async createOrder(clubId: string, dto: CreateFnbOrderDto): Promise<FnbOrder> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    const order = this.orderRepo.create({
      playerName: dto.playerName,
      playerId: dto.playerId || null,
      tableNumber: dto.tableNumber,
      items: dto.items,
      totalAmount: dto.totalAmount,
      specialInstructions: dto.specialInstructions || null,
      status: OrderStatus.PENDING,
      isAccepted: null,
      club
    });

    return await this.orderRepo.save(order);
  }

  async getOrders(
    clubId: string,
    page = 1,
    limit = 10,
    status?: OrderStatus
  ): Promise<{ orders: FnbOrder[], total: number, page: number, totalPages: number }> {
    const query = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.club', 'club')
      .leftJoinAndSelect('order.station', 'station')
      .where('club.id = :clubId', { clubId });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    const total = await query.getCount();
    const orders = await query
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      orders,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getOrder(clubId: string, orderId: string): Promise<FnbOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, club: { id: clubId } },
      relations: ['club', 'station']
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  async updateOrderStatus(clubId: string, orderId: string, dto: UpdateFnbOrderDto, updatedBy: string): Promise<FnbOrder> {
    const order = await this.getOrder(clubId, orderId);
    
    if (dto.status) {
      // Validate status transition
      if (!this.isValidStatusTransition(order.status, dto.status)) {
        throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);
      }

      order.status = dto.status;
      order.statusHistory = [
        ...(order.statusHistory || []),
        {
          status: dto.status,
          timestamp: new Date(),
          updatedBy
        }
      ];

      // Generate invoice if being marked as delivered
      if (dto.status === OrderStatus.DELIVERED && !order.invoiceNumber) {
        order.invoiceNumber = await this.generateInvoiceNumber(clubId);
        order.invoiceGeneratedAt = new Date();

        // Update station counts
        if (order.station) {
          const station = await this.stationRepo.findOne({ where: { id: order.station.id } });
          if (station) {
            station.ordersPending = Math.max(0, station.ordersPending - 1);
            station.ordersCompleted += 1;
            await this.stationRepo.save(station);
          }
        }
      }
    }

    return await this.orderRepo.save(order);
  }

  async cancelOrder(clubId: string, orderId: string, reason: string, cancelledBy: string): Promise<FnbOrder> {
    const order = await this.getOrder(clubId, orderId);

    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel a delivered order');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    const previousStatus = order.status;

    order.status = OrderStatus.CANCELLED;
    order.rejectedReason = reason;
    order.processedBy = cancelledBy;
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: OrderStatus.CANCELLED,
        timestamp: new Date(),
        updatedBy: cancelledBy
      }
    ];

    // Update station counts if order was in processing
    if (order.station && previousStatus === OrderStatus.PROCESSING) {
      const station = await this.stationRepo.findOne({ where: { id: order.station.id } });
      if (station) {
        station.ordersPending = Math.max(0, station.ordersPending - 1);
        await this.stationRepo.save(station);
      }
    }

    return await this.orderRepo.save(order);
  }

  async generateInvoice(clubId: string, orderId: string): Promise<{ invoiceNumber: string, order: FnbOrder }> {
    const order = await this.getOrder(clubId, orderId);

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('Only delivered orders can have invoices generated');
    }

    if (!order.invoiceNumber) {
      order.invoiceNumber = await this.generateInvoiceNumber(clubId);
      order.invoiceGeneratedAt = new Date();
      await this.orderRepo.save(order);
    }

    return {
      invoiceNumber: order.invoiceNumber,
      order
    };
  }

  async getOrderAnalytics(clubId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalOrders, pendingOrders, processingOrders, completedOrders, cancelledOrders, todayOrders, todayRevenue] = await Promise.all([
      this.orderRepo.count({ where: { club: { id: clubId } } }),
      this.orderRepo.count({ where: { club: { id: clubId }, status: OrderStatus.PENDING } }),
      this.orderRepo.count({ where: { club: { id: clubId }, status: OrderStatus.PROCESSING } }),
      this.orderRepo.count({ where: { club: { id: clubId }, status: OrderStatus.DELIVERED } }),
      this.orderRepo.count({ where: { club: { id: clubId }, status: OrderStatus.CANCELLED } }),
      this.orderRepo.count({ where: { club: { id: clubId }, createdAt: MoreThanOrEqual(today) } }),
      this.orderRepo.createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'total')
        .where('order.clubId = :clubId', { clubId })
        .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
        .andWhere('order.createdAt >= :today', { today })
        .getRawOne()
    ]);

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      todayOrders,
      todayRevenue: parseFloat(todayRevenue?.total || '0')
    };
  }

  async getPopularItems(clubId: string, limit = 10): Promise<any[]> {
    const result = await this.orderRepo.createQueryBuilder('order')
      .select('order.items', 'items')
      .where('order.clubId = :clubId', { clubId })
      .andWhere('order.status = :status', { status: OrderStatus.DELIVERED })
      .getMany();

    // Count item occurrences
    const itemCounts: { [key: string]: number } = {};
    result.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemName = item.name || item.itemName;
          if (itemName) {
            itemCounts[itemName] = (itemCounts[itemName] || 0) + (item.quantity || 1);
          }
        });
      }
    });

    // Sort and return top items
    return Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([name, count]) => ({ name, ordersCount: count }));
  }

  // ==================== KITCHEN STATIONS ====================

  async createKitchenStation(clubId: string, dto: CreateKitchenStationDto): Promise<KitchenStation> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Check if station number already exists
    const existing = await this.stationRepo.findOne({
      where: { club: { id: clubId }, stationNumber: dto.stationNumber }
    });
    if (existing) {
      throw new BadRequestException(`Station number ${dto.stationNumber} already exists`);
    }

    const station = this.stationRepo.create({
      ...dto,
      club
    });

    return await this.stationRepo.save(station);
  }

  async getKitchenStations(clubId: string, activeOnly = false): Promise<KitchenStation[]> {
    const query = this.stationRepo.createQueryBuilder('station')
      .leftJoinAndSelect('station.club', 'club')
      .leftJoinAndSelect('station.chef', 'chef')
      .where('club.id = :clubId', { clubId });

    if (activeOnly) {
      query.andWhere('station.isActive = :isActive', { isActive: true });
    }

    return await query
      .orderBy('station.stationNumber', 'ASC')
      .getMany();
  }

  async getKitchenStation(clubId: string, stationId: string): Promise<KitchenStation> {
    const station = await this.stationRepo.findOne({
      where: { id: stationId, club: { id: clubId } },
      relations: ['club', 'chef']
    });

    if (!station) {
      throw new NotFoundException(`Station with ID ${stationId} not found`);
    }

    return station;
  }

  async updateKitchenStation(clubId: string, stationId: string, dto: UpdateKitchenStationDto): Promise<KitchenStation> {
    const station = await this.getKitchenStation(clubId, stationId);

    // If station number is being changed, check it doesn't conflict
    if (dto.stationNumber && dto.stationNumber !== station.stationNumber) {
      const existing = await this.stationRepo.findOne({
        where: { club: { id: clubId }, stationNumber: dto.stationNumber }
      });
      if (existing && existing.id !== stationId) {
        throw new BadRequestException(`Station number ${dto.stationNumber} already exists`);
      }
    }

    Object.assign(station, dto);
    return await this.stationRepo.save(station);
  }

  async deleteKitchenStation(clubId: string, stationId: string): Promise<void> {
    const station = await this.getKitchenStation(clubId, stationId);
    
    // Check if station has pending orders
    const pendingOrders = await this.orderRepo.count({
      where: { 
        station: { id: stationId },
        status: OrderStatus.PROCESSING
      }
    });

    if (pendingOrders > 0) {
      throw new BadRequestException(`Cannot delete station with ${pendingOrders} pending orders`);
    }

    await this.stationRepo.remove(station);
  }

  // ==================== MENU CATEGORIES ====================

  async getMenuCategories(clubId: string): Promise<MenuCategory[]> {
    return await this.categoryRepo.find({
      where: { club: { id: clubId } },
      order: { isDefault: 'DESC', categoryName: 'ASC' }
    });
  }

  async createMenuCategory(clubId: string, categoryName: string): Promise<MenuCategory> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException(`Club with ID ${clubId} not found`);
    }

    // Check if category already exists
    const existing = await this.categoryRepo.findOne({
      where: { club: { id: clubId }, categoryName }
    });
    if (existing) {
      throw new BadRequestException(`Category "${categoryName}" already exists`);
    }

    const category = this.categoryRepo.create({
      categoryName,
      club,
      isDefault: false
    });

    return await this.categoryRepo.save(category);
  }

  async deleteMenuCategory(clubId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, club: { id: clubId } }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (category.isDefault) {
      throw new BadRequestException('Cannot delete default category');
    }

    // Check if any menu items use this category
    const itemCount = await this.menuRepo.count({
      where: { club: { id: clubId }, category: category.categoryName }
    });

    if (itemCount > 0) {
      throw new BadRequestException(`Cannot delete category with ${itemCount} menu items`);
    }

    await this.categoryRepo.remove(category);
  }

  // ==================== ORDER ACCEPTANCE/REJECTION ====================

  async acceptOrder(
    clubId: string, 
    orderId: string, 
    dto: AcceptRejectOrderDto,
    processedBy: string
  ): Promise<FnbOrder> {
    if (!dto.isAccepted) {
      throw new BadRequestException('Use acceptOrder for accepting orders only');
    }

    if (!dto.stationId) {
      throw new BadRequestException('Station must be selected when accepting an order');
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId, club: { id: clubId } },
      relations: ['club', 'station']
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be accepted');
    }

    if (order.isAccepted !== null) {
      throw new BadRequestException('Order has already been processed');
    }

    // Validate station exists
    const station = await this.stationRepo.findOne({
      where: { id: dto.stationId, club: { id: clubId } }
    });

    if (!station) {
      throw new NotFoundException(`Station with ID ${dto.stationId} not found`);
    }

    if (!station.isActive) {
      throw new BadRequestException('Selected station is not active');
    }

    // Generate order number only when accepted
    const orderNumber = await this.generateOrderNumber(clubId);

    // Update order
    order.isAccepted = true;
    order.orderNumber = orderNumber;
    order.station = station;
    order.stationId = station.id;
    order.stationName = station.stationName;
    order.chefAssigned = station.chefName || null;
    order.status = OrderStatus.PROCESSING;
    order.sentToChef = true;
    order.processedBy = processedBy;

    // Update status history
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: OrderStatus.PROCESSING,
        timestamp: new Date(),
        updatedBy: processedBy
      }
    ];

    // Update station pending count
    station.ordersPending += 1;
    await this.stationRepo.save(station);

    return await this.orderRepo.save(order);
  }

  async rejectOrder(
    clubId: string,
    orderId: string,
    dto: AcceptRejectOrderDto,
    processedBy: string
  ): Promise<FnbOrder> {
    if (dto.isAccepted) {
      throw new BadRequestException('Use rejectOrder for rejecting orders only');
    }

    if (!dto.rejectedReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId, club: { id: clubId } },
      relations: ['club']
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be rejected');
    }

    if (order.isAccepted !== null) {
      throw new BadRequestException('Order has already been processed');
    }

    // Update order
    order.isAccepted = false;
    order.rejectedReason = dto.rejectedReason;
    order.status = OrderStatus.CANCELLED;
    order.processedBy = processedBy;

    // Update status history
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: OrderStatus.CANCELLED,
        timestamp: new Date(),
        updatedBy: processedBy
      }
    ];

    // No order number for rejected orders
    return await this.orderRepo.save(order);
  }

  // ==================== ORDER STATUS UPDATES WITH STATION TRACKING ====================

  async markOrderReady(clubId: string, orderId: string, updatedBy: string): Promise<FnbOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, club: { id: clubId } },
      relations: ['club', 'station']
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException('Only processing orders can be marked as ready');
    }

    order.status = OrderStatus.READY;
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: OrderStatus.READY,
        timestamp: new Date(),
        updatedBy
      }
    ];

    return await this.orderRepo.save(order);
  }

  async markOrderDelivered(clubId: string, orderId: string, updatedBy: string): Promise<FnbOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, club: { id: clubId } },
      relations: ['club', 'station']
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== OrderStatus.READY) {
      throw new BadRequestException('Only ready orders can be marked as delivered');
    }

    // Generate invoice number only when delivered
    const invoiceNumber = await this.generateInvoiceNumber(clubId);

    order.status = OrderStatus.DELIVERED;
    order.invoiceNumber = invoiceNumber;
    order.invoiceGeneratedAt = new Date();
    order.statusHistory = [
      ...(order.statusHistory || []),
      {
        status: OrderStatus.DELIVERED,
        timestamp: new Date(),
        updatedBy
      }
    ];

    // Update station counts
    if (order.station) {
      const station = await this.stationRepo.findOne({ where: { id: order.station.id } });
      if (station) {
        station.ordersPending = Math.max(0, station.ordersPending - 1);
        station.ordersCompleted += 1;
        await this.stationRepo.save(station);
      }
    }

    return await this.orderRepo.save(order);
  }

  // ==================== STATION STATISTICS ====================

  async getStationStatistics(clubId: string, stationId: string): Promise<any> {
    const station = await this.getKitchenStation(clubId, stationId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayCompleted, todayPending, allTimeCompleted] = await Promise.all([
      this.orderRepo.count({
        where: {
          station: { id: stationId },
          status: OrderStatus.DELIVERED,
          createdAt: MoreThanOrEqual(today)
        }
      }),
      this.orderRepo.count({
        where: {
          station: { id: stationId },
          status: OrderStatus.PROCESSING
        }
      }),
      this.orderRepo.count({
        where: {
          station: { id: stationId },
          status: OrderStatus.DELIVERED
        }
      })
    ]);

    return {
      station: {
        id: station.id,
        name: station.stationName,
        number: station.stationNumber,
        chefName: station.chefName,
        isActive: station.isActive
      },
      statistics: {
        todayCompleted,
        todayPending,
        allTimeCompleted,
        storedPending: station.ordersPending,
        storedCompleted: station.ordersCompleted
      }
    };
  }

  // ==================== HELPER METHODS ====================

  private isValidStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const validTransitions: { [key in OrderStatus]?: OrderStatus[] } = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [], // Cannot transition from delivered
      [OrderStatus.CANCELLED]: [] // Cannot transition from cancelled
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private async generateOrderNumber(clubId: string): Promise<string> {
    // Get last order with order number (accepted orders only)
    const lastOrder = await this.orderRepo.findOne({
      where: { 
        club: { id: clubId },
        orderNumber: Not(IsNull())
      },
      order: { createdAt: 'DESC' }
    });

    if (!lastOrder || !lastOrder.orderNumber) {
      return '#001';
    }

    const num = parseInt(lastOrder.orderNumber.replace('#', '')) + 1;
    return `#${num.toString().padStart(3, '0')}`;
  }

  private async generateInvoiceNumber(clubId: string): Promise<string> {
    // Get last order with invoice
    const lastOrder = await this.orderRepo.findOne({
      where: { 
        club: { id: clubId },
        invoiceNumber: Not(IsNull())
      },
      order: { invoiceGeneratedAt: 'DESC' }
    });

    if (!lastOrder || !lastOrder.invoiceNumber) {
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      return `INV-${year}${month}-0001`;
    }

    // Extract number from invoice
    const match = lastOrder.invoiceNumber.match(/INV-\d{4}-(\d+)/);
    if (match) {
      const num = parseInt(match[1]) + 1;
      const today = new Date();
      const year = today.getFullYear().toString().slice(-2);
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      return `INV-${year}${month}-${num.toString().padStart(4, '0')}`;
    }

    // Fallback
    return `INV-${new Date().getTime()}`;
  }
}
