"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerOffersModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const player_offers_controller_1 = require("./player-offers.controller");
const player_offers_service_1 = require("./player-offers.service");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_module_1 = require("../clubs/clubs.module");
let PlayerOffersModule = class PlayerOffersModule {
};
exports.PlayerOffersModule = PlayerOffersModule;
exports.PlayerOffersModule = PlayerOffersModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([player_entity_1.Player]), clubs_module_1.ClubsModule],
        controllers: [player_offers_controller_1.PlayerOffersController],
        providers: [player_offers_service_1.PlayerOffersService],
        exports: [player_offers_service_1.PlayerOffersService],
    })
], PlayerOffersModule);
//# sourceMappingURL=player-offers.module.js.map