"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerTournamentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const player_tournaments_controller_1 = require("./player-tournaments.controller");
const player_tournaments_service_1 = require("./player-tournaments.service");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_module_1 = require("../clubs/clubs.module");
const auth_module_1 = require("../auth/auth.module");
let PlayerTournamentsModule = class PlayerTournamentsModule {
};
exports.PlayerTournamentsModule = PlayerTournamentsModule;
exports.PlayerTournamentsModule = PlayerTournamentsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([player_entity_1.Player]), clubs_module_1.ClubsModule, auth_module_1.AuthModule],
        controllers: [player_tournaments_controller_1.PlayerTournamentsController],
        providers: [player_tournaments_service_1.PlayerTournamentsService],
        exports: [player_tournaments_service_1.PlayerTournamentsService],
    })
], PlayerTournamentsModule);
//# sourceMappingURL=player-tournaments.module.js.map