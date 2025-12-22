"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClubSettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const club_settings_entity_1 = require("../entities/club-settings.entity");
const club_entity_1 = require("../club.entity");
let ClubSettingsService = class ClubSettingsService {
    constructor(settingsRepo, clubsRepo) {
        this.settingsRepo = settingsRepo;
        this.clubsRepo = clubsRepo;
    }
    async getSetting(clubId, key) {
        if (!key || !key.trim()) {
            throw new common_1.BadRequestException('Setting key is required');
        }
        const setting = await this.settingsRepo.findOne({
            where: { club: { id: clubId }, key: key.trim() }
        });
        if (!setting)
            return null;
        return setting.jsonValue || setting.value;
    }
    async setSetting(clubId, key, value) {
        if (!key || !key.trim()) {
            throw new common_1.BadRequestException('Setting key is required');
        }
        if (value === null || value === undefined) {
            throw new common_1.BadRequestException('Setting value cannot be null or undefined');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        let setting = await this.settingsRepo.findOne({
            where: { club: { id: clubId }, key }
        });
        if (setting) {
            if (typeof value === 'object') {
                setting.jsonValue = value;
                setting.value = null;
            }
            else {
                setting.value = value;
                setting.jsonValue = null;
            }
        }
        else {
            setting = this.settingsRepo.create({
                club,
                key,
                value: typeof value === 'string' ? value : null,
                jsonValue: typeof value === 'object' ? value : null
            });
        }
        return this.settingsRepo.save(setting);
    }
    async getAllSettings(clubId) {
        const settings = await this.settingsRepo.find({
            where: { club: { id: clubId } }
        });
        const result = {};
        for (const setting of settings) {
            result[setting.key] = setting.jsonValue || setting.value || '';
        }
        return result;
    }
};
exports.ClubSettingsService = ClubSettingsService;
exports.ClubSettingsService = ClubSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(club_settings_entity_1.ClubSettings)),
    __param(1, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ClubSettingsService);
//# sourceMappingURL=club-settings.service.js.map