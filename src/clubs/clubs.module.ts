import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from './club.entity';
import { ClubsService } from './clubs.service';
import { ClubsController } from './clubs.controller';
import { Tenant } from '../tenants/tenant.entity';
import { UserClubRole } from '../users/user-club-role.entity';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Club,
      Tenant,
      UserClubRole,
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
      Supplier
    ]),
    UsersModule,
    StorageModule,
    EventsModule
  ],
  providers: [
    ClubsService,
    StaffService,
    CreditRequestsService,
    FinancialTransactionsService,
    VipProductsService,
    PushNotificationsService,
    ClubSettingsService,
    AuditLogsService,
    WaitlistSeatingService,
    AnalyticsService,
    AffiliatesService,
    FnbService
  ],
  controllers: [ClubsController],
  exports: [
    ClubsService,
    StaffService,
    CreditRequestsService,
    FinancialTransactionsService,
    VipProductsService,
    PushNotificationsService,
    ClubSettingsService,
    AuditLogsService,
    WaitlistSeatingService,
    AnalyticsService,
    AffiliatesService,
    FnbService
  ]
})
export class ClubsModule {}



