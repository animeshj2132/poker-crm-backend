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
exports.PlayerDocumentsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const player_entity_1 = require("../clubs/entities/player.entity");
const clubs_service_1 = require("../clubs/clubs.service");
let PlayerDocumentsService = class PlayerDocumentsService {
    constructor(playersRepo, clubsService) {
        this.playersRepo = playersRepo;
        this.clubsService = clubsService;
    }
    async getPlayerDocuments(playerId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const documents = player.kycDocuments || [];
            return {
                documents: Array.isArray(documents) ? documents : [],
                kycStatus: player.kycStatus || 'pending',
                kycApprovedAt: player.kycApprovedAt || null,
                totalDocuments: Array.isArray(documents) ? documents.length : 0,
            };
        }
        catch (err) {
            console.error('Get documents error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to get documents');
        }
    }
    async uploadDocument(playerId, clubId, data, file) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const existingDocs = player.kycDocuments || [];
            const documents = Array.isArray(existingDocs) ? existingDocs : [];
            const newDocument = {
                id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: (data === null || data === void 0 ? void 0 : data.type) || 'other',
                name: (data === null || data === void 0 ? void 0 : data.name) || (file === null || file === void 0 ? void 0 : file.originalname) || 'Untitled Document',
                url: (data === null || data === void 0 ? void 0 : data.url) || (file ? `/uploads/${file.filename}` : ''),
                uploadedAt: new Date().toISOString(),
                status: 'pending',
                size: (file === null || file === void 0 ? void 0 : file.size) || 0,
                mimeType: (file === null || file === void 0 ? void 0 : file.mimetype) || 'application/octet-stream',
            };
            documents.push(newDocument);
            await this.playersRepo.update({ id: playerId }, { kycDocuments: documents });
            return {
                success: true,
                message: 'Document uploaded successfully',
                document: newDocument,
                totalDocuments: documents.length,
            };
        }
        catch (err) {
            console.error('Upload document error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to upload document');
        }
    }
    async deleteDocument(documentId, playerId, clubId) {
        try {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(playerId)) {
                throw new common_1.BadRequestException('Invalid player ID format');
            }
            if (!uuidRegex.test(clubId)) {
                throw new common_1.BadRequestException('Invalid club ID format');
            }
            const player = await this.playersRepo.findOne({
                where: { id: playerId, club: { id: clubId } },
                relations: ['club'],
            });
            if (!player) {
                throw new common_1.NotFoundException('Player not found');
            }
            const existingDocs = player.kycDocuments || [];
            const documents = Array.isArray(existingDocs) ? existingDocs : [];
            const updatedDocuments = documents.filter((doc) => doc.id !== documentId);
            if (documents.length === updatedDocuments.length) {
                throw new common_1.NotFoundException('Document not found');
            }
            await this.playersRepo.update({ id: playerId }, { kycDocuments: updatedDocuments });
            return {
                success: true,
                message: 'Document deleted successfully',
                totalDocuments: updatedDocuments.length,
            };
        }
        catch (err) {
            console.error('Delete document error:', err);
            if (err instanceof common_1.BadRequestException ||
                err instanceof common_1.NotFoundException ||
                err instanceof common_1.ForbiddenException) {
                throw err;
            }
            throw new common_1.BadRequestException('Failed to delete document');
        }
    }
};
exports.PlayerDocumentsService = PlayerDocumentsService;
exports.PlayerDocumentsService = PlayerDocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(player_entity_1.Player)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        clubs_service_1.ClubsService])
], PlayerDocumentsService);
//# sourceMappingURL=player-documents.service.js.map