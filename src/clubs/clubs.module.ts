import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from './club.entity';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { Tenant } from '../tenants/tenant.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';
import { Staff } from './entities/staff.entity';
import { CreditRequest } from './entities/credit-request.entity';
import { FinancialTransaction } from './entities/financial-transaction.entity';
import { VipProduct } from './entities/vip-product.entity';
import { PushNotification } from './entities/push-notification.entity';
import { ClubSettings } from './entities/club-settings.entity';
import { AuditLog } from './entities/audit-log.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { Table } from './entities/table.entity';
import { Affiliate } from './entities/affiliate.entity';
import { Player } from './entities/player.entity';
import { User } from '../users/user.entity';
import { StaffService } from './services/staff.service';
import { AffiliatesService } from './services/affiliates.service';
import { CreditRequestsService } from './services/credit-requests.service';
import { FinancialTransactionsService } from './services/financial-transactions.service';
import { VipProductsService } from './services/vip-products.service';
import { PushNotificationsService } from './services/push-notifications.service';
import { ClubSettingsService } from './services/club-settings.service';
import { AuditLogsService } from './services/audit-logs.service';
import { WaitlistSeatingService } from './services/waitlist-seating.service';
import { AnalyticsService } from './services/analytics.service';
import { FnbService } from './services/fnb.service';
import { FnbOrder } from './entities/fnb-order.entity';
import { MenuItem } from './entities/menu-item.entity';
import { InventoryItem } from './entities/inventory-item.entity';
import { Supplier } from './entities/supplier.entity';
import { EventsModule } from '../events/events.module';
import { TournamentsService } from './services/tournaments.service';
import { StaffManagementService } from './services/staff-management.service';
import { ShiftManagementService } from './services/shift-management.service';
import { Shift } from './entities/shift.entity';
import { PayrollService } from './services/payroll.service';
import { SalaryPayment } from './entities/salary-payment.entity';
import { DealerTips } from './entities/dealer-tips.entity';
import { DealerCashout } from './entities/dealer-cashout.entity';
import { TipSettings } from './entities/tip-settings.entity';
import { PlayerBonus } from './entities/player-bonus.entity';
import { StaffBonus } from './entities/staff-bonus.entity';
import { BonusService } from './services/bonus.service';
import { AffiliateTransaction } from './entities/affiliate-transaction.entity';
import { FinancialOverridesService } from './services/financial-overrides.service';
import { KitchenStation } from './entities/kitchen-station.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { FnbEnhancedService } from './services/fnb-enhanced.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './services/chat.service';
import { ReportsService } from './services/reports.service';
import { RakeCollection } from './entities/rake-collection.entity';
import { RakeCollectionService } from './services/rake-collection.service';
import { BuyOutRequest } from './entities/buyout-request.entity';
import { BuyOutRequestService } from './services/buyout-request.service';
import { BuyInRequest } from './entities/buyin-request.entity';
import { BuyInRequestService } from './services/buyin-request.service';
import { AttendanceTracking } from './entities/attendance-tracking.entity';
import { AttendanceTrackingService } from './services/attendance-tracking.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Club,
      Tenant,
      UserClubRole,
      UserTenantRole,
      Staff,
      CreditRequest,
      FinancialTransaction,
      VipProduct,
      PushNotification,
      ClubSettings,
      AuditLog,
      WaitlistEntry,
      Table,
      Affiliate,
      Player,
      User,
      FnbOrder,
      MenuItem,
      InventoryItem,
      Supplier,
      KitchenStation,
      MenuCategory,
      Shift,
      SalaryPayment,
      DealerTips,
      DealerCashout,
      TipSettings,
      PlayerBonus,
      StaffBonus,
      AffiliateTransaction,
      ChatSession,
      ChatMessage,
      RakeCollection,
      BuyOutRequest,
      BuyInRequest,
      AttendanceTracking
    ]),
    UsersModule,
    StorageModule,
    EventsModule
  ],
  providers: [
    ClubsService,
    StaffService,
    StaffManagementService,
    CreditRequestsService,
    FinancialTransactionsService,
    VipProductsService,
    PushNotificationsService,
    ClubSettingsService,
    AuditLogsService,
    WaitlistSeatingService,
    AnalyticsService,
    AffiliatesService,
    FnbService,
    FnbEnhancedService,
    TournamentsService,
    ShiftManagementService,
    PayrollService,
    BonusService,
    FinancialOverridesService,
    ChatService,
    ReportsService,
    RakeCollectionService,
    BuyOutRequestService,
    BuyInRequestService,
    AttendanceTrackingService
  ],
  controllers: [ClubsController],
  exports: [
    ClubsService,
    StaffService,
    StaffManagementService,
    CreditRequestsService,
    FinancialTransactionsService,
    VipProductsService,
    PushNotificationsService,
    ClubSettingsService,
    AuditLogsService,
    WaitlistSeatingService,
    AnalyticsService,
    AffiliatesService,
    FnbService,
    FnbEnhancedService,
    TournamentsService,
    ShiftManagementService,
    PayrollService,
    BonusService,
    FinancialOverridesService,
    ChatService,
    ReportsService,
    RakeCollectionService,
    BuyOutRequestService,
    BuyInRequestService,
    AttendanceTrackingService
  ]
})
export class ClubsModule {}



