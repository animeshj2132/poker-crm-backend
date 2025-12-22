"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const club_entity_1 = require("./club.entity");
const clubs_service_1 = require("./clubs.service");
const clubs_controller_1 = require("./clubs.controller");
const tenant_entity_1 = require("../tenants/tenant.entity");
const user_club_role_entity_1 = require("../users/user-club-role.entity");
const users_module_1 = require("../users/users.module");
const storage_module_1 = require("../storage/storage.module");
const staff_entity_1 = require("./entities/staff.entity");
const credit_request_entity_1 = require("./entities/credit-request.entity");
const financial_transaction_entity_1 = require("./entities/financial-transaction.entity");
const vip_product_entity_1 = require("./entities/vip-product.entity");
const club_settings_entity_1 = require("./entities/club-settings.entity");
const audit_log_entity_1 = require("./entities/audit-log.entity");
const waitlist_entry_entity_1 = require("./entities/waitlist-entry.entity");
const table_entity_1 = require("./entities/table.entity");
const affiliate_entity_1 = require("./entities/affiliate.entity");
const player_entity_1 = require("./entities/player.entity");
const user_entity_1 = require("../users/user.entity");
const staff_service_1 = require("./services/staff.service");
const affiliates_service_1 = require("./services/affiliates.service");
const credit_requests_service_1 = require("./services/credit-requests.service");
const financial_transactions_service_1 = require("./services/financial-transactions.service");
const vip_products_service_1 = require("./services/vip-products.service");
const club_settings_service_1 = require("./services/club-settings.service");
const audit_logs_service_1 = require("./services/audit-logs.service");
const waitlist_seating_service_1 = require("./services/waitlist-seating.service");
const analytics_service_1 = require("./services/analytics.service");
const fnb_service_1 = require("./services/fnb.service");
const fnb_order_entity_1 = require("./entities/fnb-order.entity");
const menu_item_entity_1 = require("./entities/menu-item.entity");
const inventory_item_entity_1 = require("./entities/inventory-item.entity");
const supplier_entity_1 = require("./entities/supplier.entity");
const events_module_1 = require("../events/events.module");
let ClubsModule = class ClubsModule {
};
exports.ClubsModule = ClubsModule;
exports.ClubsModule = ClubsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                club_entity_1.Club,
                tenant_entity_1.Tenant,
                user_club_role_entity_1.UserClubRole,
                staff_entity_1.Staff,
                credit_request_entity_1.CreditRequest,
                financial_transaction_entity_1.FinancialTransaction,
                vip_product_entity_1.VipProduct,
                club_settings_entity_1.ClubSettings,
                audit_log_entity_1.AuditLog,
                waitlist_entry_entity_1.WaitlistEntry,
                table_entity_1.Table,
                affiliate_entity_1.Affiliate,
                player_entity_1.Player,
                user_entity_1.User,
                fnb_order_entity_1.FnbOrder,
                menu_item_entity_1.MenuItem,
                inventory_item_entity_1.InventoryItem,
                supplier_entity_1.Supplier
            ]),
            users_module_1.UsersModule,
            storage_module_1.StorageModule,
            events_module_1.EventsModule
        ],
        providers: [
            clubs_service_1.ClubsService,
            staff_service_1.StaffService,
            credit_requests_service_1.CreditRequestsService,
            financial_transactions_service_1.FinancialTransactionsService,
            vip_products_service_1.VipProductsService,
            club_settings_service_1.ClubSettingsService,
            audit_logs_service_1.AuditLogsService,
            waitlist_seating_service_1.WaitlistSeatingService,
            analytics_service_1.AnalyticsService,
            affiliates_service_1.AffiliatesService,
            fnb_service_1.FnbService
        ],
        controllers: [clubs_controller_1.ClubsController],
        exports: [
            clubs_service_1.ClubsService,
            staff_service_1.StaffService,
            credit_requests_service_1.CreditRequestsService,
            financial_transactions_service_1.FinancialTransactionsService,
            vip_products_service_1.VipProductsService,
            club_settings_service_1.ClubSettingsService,
            audit_logs_service_1.AuditLogsService,
            waitlist_seating_service_1.WaitlistSeatingService,
            analytics_service_1.AnalyticsService,
            affiliates_service_1.AffiliatesService,
            fnb_service_1.FnbService
        ]
    })
], ClubsModule);
//# sourceMappingURL=clubs.module.js.map