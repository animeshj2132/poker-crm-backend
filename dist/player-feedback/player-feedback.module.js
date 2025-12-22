"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerFeedbackModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const player_feedback_controller_1 = require("./player-feedback.controller");
const player_feedback_service_1 = require("./player-feedback.service");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_module_1 = require("../clubs/clubs.module");
let PlayerFeedbackModule = class PlayerFeedbackModule {
};
exports.PlayerFeedbackModule = PlayerFeedbackModule;
exports.PlayerFeedbackModule = PlayerFeedbackModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([player_entity_1.Player]), clubs_module_1.ClubsModule],
        controllers: [player_feedback_controller_1.PlayerFeedbackController],
        providers: [player_feedback_service_1.PlayerFeedbackService],
        exports: [player_feedback_service_1.PlayerFeedbackService],
    })
], PlayerFeedbackModule);
//# sourceMappingURL=player-feedback.module.js.map