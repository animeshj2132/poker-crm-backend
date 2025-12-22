"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerDocumentsModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const player_documents_controller_1 = require("./player-documents.controller");
const player_documents_service_1 = require("./player-documents.service");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_module_1 = require("../clubs/clubs.module");
let PlayerDocumentsModule = class PlayerDocumentsModule {
};
exports.PlayerDocumentsModule = PlayerDocumentsModule;
exports.PlayerDocumentsModule = PlayerDocumentsModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([player_entity_1.Player]), clubs_module_1.ClubsModule],
        controllers: [player_documents_controller_1.PlayerDocumentsController],
        providers: [player_documents_service_1.PlayerDocumentsService],
        exports: [player_documents_service_1.PlayerDocumentsService],
    })
], PlayerDocumentsModule);
//# sourceMappingURL=player-documents.module.js.map