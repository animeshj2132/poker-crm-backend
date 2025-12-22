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
exports.PlayerDocumentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const player_documents_service_1 = require("./player-documents.service");
let PlayerDocumentsController = class PlayerDocumentsController {
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    async getMyDocuments(playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.documentsService.getPlayerDocuments(playerId.trim(), clubId.trim());
    }
    async uploadDocument(playerId, clubId, body, file) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.documentsService.uploadDocument(playerId.trim(), clubId.trim(), body, file);
    }
    async deleteDocument(documentId, playerId, clubId) {
        if (!playerId || !playerId.trim()) {
            throw new common_1.BadRequestException('x-player-id header is required');
        }
        if (!clubId || !clubId.trim()) {
            throw new common_1.BadRequestException('x-club-id header is required');
        }
        return this.documentsService.deleteDocument(documentId, playerId.trim(), clubId.trim());
    }
};
exports.PlayerDocumentsController = PlayerDocumentsController;
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PlayerDocumentsController.prototype, "getMyDocuments", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.Headers)('x-player-id')),
    __param(1, (0, common_1.Headers)('x-club-id')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PlayerDocumentsController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Delete)(':documentId'),
    __param(0, (0, common_1.Param)('documentId')),
    __param(1, (0, common_1.Headers)('x-player-id')),
    __param(2, (0, common_1.Headers)('x-club-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PlayerDocumentsController.prototype, "deleteDocument", null);
exports.PlayerDocumentsController = PlayerDocumentsController = __decorate([
    (0, common_1.Controller)('player-documents'),
    __metadata("design:paramtypes", [player_documents_service_1.PlayerDocumentsService])
], PlayerDocumentsController);
//# sourceMappingURL=player-documents.controller.js.map