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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBrandingDto = void 0;
const class_validator_1 = require("class-validator");
class UpdateBrandingDto {
}
exports.UpdateBrandingDto = UpdateBrandingDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_tld: false }, { message: 'logoUrl must be a URL' }),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], UpdateBrandingDto.prototype, "logoUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUrl)({ require_tld: false }, { message: 'faviconUrl must be a URL' }),
    (0, class_validator_1.MaxLength)(2048),
    __metadata("design:type", String)
], UpdateBrandingDto.prototype, "faviconUrl", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'primaryColor must be hex like #RRGGBB' }),
    __metadata("design:type", String)
], UpdateBrandingDto.prototype, "primaryColor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'secondaryColor must be hex like #RRGGBB' }),
    __metadata("design:type", String)
], UpdateBrandingDto.prototype, "secondaryColor", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], UpdateBrandingDto.prototype, "theme", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(255),
    __metadata("design:type", String)
], UpdateBrandingDto.prototype, "customDomain", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata("design:type", Boolean)
], UpdateBrandingDto.prototype, "whiteLabel", void 0);
//# sourceMappingURL=update-branding.dto.js.map