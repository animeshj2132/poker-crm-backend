"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const users_module_1 = require("../users/users.module");
const clubs_module_1 = require("../clubs/clubs.module");
const user_tenant_role_entity_1 = require("../users/user-tenant-role.entity");
const user_club_role_entity_1 = require("../users/user-club-role.entity");
const player_entity_1 = require("../clubs/entities/player.entity");
const financial_transaction_entity_1 = require("../clubs/entities/financial-transaction.entity");
const waitlist_entry_entity_1 = require("../clubs/entities/waitlist-entry.entity");
const table_entity_1 = require("../clubs/entities/table.entity");
const api_key_guard_1 = require("./api-key.guard");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            users_module_1.UsersModule,
            clubs_module_1.ClubsModule,
            typeorm_1.TypeOrmModule.forFeature([user_tenant_role_entity_1.UserTenantRole, user_club_role_entity_1.UserClubRole, player_entity_1.Player, financial_transaction_entity_1.FinancialTransaction, waitlist_entry_entity_1.WaitlistEntry, table_entity_1.Table])
        ],
        providers: [auth_service_1.AuthService, api_key_guard_1.ApiKeyAuthGuard],
        controllers: [auth_controller_1.AuthController],
        exports: [auth_service_1.AuthService, api_key_guard_1.ApiKeyAuthGuard]
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map