"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const users_module_1 = require("./users/users.module");
const tenants_module_1 = require("./tenants/tenants.module");
const clubs_module_1 = require("./clubs/clubs.module");
const auth_module_1 = require("./auth/auth.module");
const user_entity_1 = require("./users/user.entity");
const tenant_entity_1 = require("./tenants/tenant.entity");
const club_entity_1 = require("./clubs/club.entity");
const user_tenant_role_entity_1 = require("./users/user-tenant-role.entity");
const user_club_role_entity_1 = require("./users/user-club-role.entity");
const staff_entity_1 = require("./clubs/entities/staff.entity");
const credit_request_entity_1 = require("./clubs/entities/credit-request.entity");
const financial_transaction_entity_1 = require("./clubs/entities/financial-transaction.entity");
const vip_product_entity_1 = require("./clubs/entities/vip-product.entity");
const club_settings_entity_1 = require("./clubs/entities/club-settings.entity");
const audit_log_entity_1 = require("./clubs/entities/audit-log.entity");
const api_key_guard_1 = require("./auth/api-key.guard");
const roles_guard_1 = require("./common/rbac/roles.guard");
const all_exceptions_filter_1 = require("./common/filters/all-exceptions.filter");
const storage_module_1 = require("./storage/storage.module");
const events_module_1 = require("./events/events.module");
const player_documents_module_1 = require("./player-documents/player-documents.module");
const player_chat_module_1 = require("./player-chat/player-chat.module");
const player_offers_module_1 = require("./player-offers/player-offers.module");
const player_vip_module_1 = require("./player-vip/player-vip.module");
const player_feedback_module_1 = require("./player-feedback/player-feedback.module");
const player_tournaments_module_1 = require("./player-tournaments/player-tournaments.module");
const player_playtime_module_1 = require("./player-playtime/player-playtime.module");
const dns = require("dns");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                useFactory: async () => {
                    dns.setDefaultResultOrder('ipv4first');
                    const dbUrl = process.env.DATABASE_URL;
                    if (!dbUrl) {
                        throw new Error('DATABASE_URL environment variable is not set');
                    }
                    const url = new URL(dbUrl);
                    return {
                        type: 'postgres',
                        host: url.hostname,
                        port: parseInt(url.port) || 5432,
                        username: url.username,
                        password: url.password,
                        database: url.pathname.slice(1),
                        autoLoadEntities: true,
                        synchronize: false,
                        ssl: {
                            rejectUnauthorized: false
                        },
                        extra: {
                            connectionTimeoutMillis: 10000,
                            max: 20,
                            idleTimeoutMillis: 30000,
                        }
                    };
                }
            }),
            typeorm_1.TypeOrmModule.forFeature([
                user_entity_1.User,
                tenant_entity_1.Tenant,
                club_entity_1.Club,
                user_tenant_role_entity_1.UserTenantRole,
                user_club_role_entity_1.UserClubRole,
                staff_entity_1.Staff,
                credit_request_entity_1.CreditRequest,
                financial_transaction_entity_1.FinancialTransaction,
                vip_product_entity_1.VipProduct,
                club_settings_entity_1.ClubSettings,
                audit_log_entity_1.AuditLog
            ]),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            tenants_module_1.TenantsModule,
            clubs_module_1.ClubsModule,
            storage_module_1.StorageModule,
            events_module_1.EventsModule,
            player_documents_module_1.PlayerDocumentsModule,
            player_chat_module_1.PlayerChatModule,
            player_offers_module_1.PlayerOffersModule,
            player_vip_module_1.PlayerVipModule,
            player_feedback_module_1.PlayerFeedbackModule,
            player_tournaments_module_1.PlayerTournamentsModule,
            player_playtime_module_1.PlayerPlaytimeModule
        ],
        providers: [
            { provide: core_1.APP_GUARD, useClass: api_key_guard_1.ApiKeyAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_FILTER, useClass: all_exceptions_filter_1.AllExceptionsFilter }
        ]
    })
], AppModule);
//# sourceMappingURL=app.module.js.map