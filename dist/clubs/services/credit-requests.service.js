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
exports.CreditRequestsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const credit_request_entity_1 = require("../entities/credit-request.entity");
const club_entity_1 = require("../club.entity");
const events_service_1 = require("../../events/events.service");
let CreditRequestsService = class CreditRequestsService {
    constructor(creditRequestsRepo, clubsRepo, eventsService) {
        this.creditRequestsRepo = creditRequestsRepo;
        this.clubsRepo = clubsRepo;
        this.eventsService = eventsService;
    }
    async create(clubId, data) {
        var _a;
        if (!data.playerId || !data.playerId.trim()) {
            throw new common_1.BadRequestException('Player ID is required');
        }
        if (data.playerId.trim().length > 100) {
            throw new common_1.BadRequestException('Player ID cannot exceed 100 characters');
        }
        if (!data.playerName || !data.playerName.trim()) {
            throw new common_1.BadRequestException('Player name is required');
        }
        if (data.playerName.trim().length > 200) {
            throw new common_1.BadRequestException('Player name cannot exceed 200 characters');
        }
        if (data.amount === null || data.amount === undefined) {
            throw new common_1.BadRequestException('Amount is required');
        }
        if (typeof data.amount !== 'number' || isNaN(data.amount)) {
            throw new common_1.BadRequestException('Amount must be a valid number');
        }
        if (data.amount <= 0) {
            throw new common_1.BadRequestException('Amount must be greater than 0');
        }
        if (data.amount > 100000000) {
            throw new common_1.BadRequestException('Amount exceeds maximum limit of ₹100,000,000');
        }
        if (data.notes && data.notes.trim().length > 500) {
            throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const existingRequest = await this.creditRequestsRepo.findOne({
            where: {
                club: { id: clubId },
                playerId: data.playerId.trim(),
                status: credit_request_entity_1.CreditRequestStatus.PENDING
            }
        });
        if (existingRequest) {
            throw new common_1.ConflictException('A pending credit request already exists for this player');
        }
        const request = this.creditRequestsRepo.create({
            playerId: data.playerId.trim(),
            playerName: data.playerName.trim(),
            amount: data.amount,
            notes: ((_a = data.notes) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            status: credit_request_entity_1.CreditRequestStatus.PENDING,
            visibleToPlayer: false,
            limit: 0,
            club
        });
        return this.creditRequestsRepo.save(request);
    }
    async findAll(clubId, status) {
        const where = { club: { id: clubId } };
        if (status)
            where.status = status;
        return this.creditRequestsRepo.find({
            where,
            order: { createdAt: 'DESC' }
        });
    }
    async findOne(id, clubId) {
        const request = await this.creditRequestsRepo.findOne({
            where: { id, club: { id: clubId } }
        });
        if (!request)
            throw new common_1.NotFoundException('Credit request not found');
        return request;
    }
    async approve(id, clubId, limit) {
        const request = await this.findOne(id, clubId);
        if (request.status === credit_request_entity_1.CreditRequestStatus.APPROVED) {
            throw new common_1.ConflictException('Credit request has already been approved');
        }
        if (request.status === credit_request_entity_1.CreditRequestStatus.DENIED) {
            throw new common_1.ConflictException('Cannot approve a denied credit request');
        }
        if (limit !== undefined) {
            if (limit < 0) {
                throw new common_1.BadRequestException('Credit limit cannot be negative');
            }
            if (limit > 100000000) {
                throw new common_1.BadRequestException('Credit limit exceeds maximum of ₹100,000,000');
            }
            request.limit = limit;
        }
        else {
            request.limit = request.amount;
        }
        request.status = credit_request_entity_1.CreditRequestStatus.APPROVED;
        request.visibleToPlayer = true;
        const savedRequest = await this.creditRequestsRepo.save(request);
        if (this.eventsService) {
            this.eventsService.emitCreditRequestStatusChange(savedRequest.playerId, clubId, savedRequest);
        }
        return savedRequest;
    }
    async deny(id, clubId) {
        const request = await this.findOne(id, clubId);
        if (request.status === credit_request_entity_1.CreditRequestStatus.DENIED) {
            throw new common_1.ConflictException('Credit request has already been denied');
        }
        if (request.status === credit_request_entity_1.CreditRequestStatus.APPROVED) {
            throw new common_1.ConflictException('Cannot deny an approved credit request');
        }
        request.status = credit_request_entity_1.CreditRequestStatus.DENIED;
        request.visibleToPlayer = false;
        request.limit = 0;
        const savedRequest = await this.creditRequestsRepo.save(request);
        if (this.eventsService) {
            this.eventsService.emitCreditRequestStatusChange(savedRequest.playerId, clubId, savedRequest);
        }
        return savedRequest;
    }
    async updateVisibility(id, clubId, visible) {
        const request = await this.findOne(id, clubId);
        request.visibleToPlayer = visible;
        return this.creditRequestsRepo.save(request);
    }
    async updateLimit(id, clubId, limit) {
        if (limit === null || limit === undefined) {
            throw new common_1.BadRequestException('Credit limit is required');
        }
        if (typeof limit !== 'number' || isNaN(limit)) {
            throw new common_1.BadRequestException('Credit limit must be a valid number');
        }
        if (limit < 0) {
            throw new common_1.BadRequestException('Credit limit cannot be negative');
        }
        if (limit > 100000000) {
            throw new common_1.BadRequestException('Credit limit exceeds maximum of ₹100,000,000');
        }
        const request = await this.findOne(id, clubId);
        if (request.status !== credit_request_entity_1.CreditRequestStatus.APPROVED) {
            throw new common_1.BadRequestException('Can only update limit for approved credit requests');
        }
        request.limit = limit;
        return this.creditRequestsRepo.save(request);
    }
};
exports.CreditRequestsService = CreditRequestsService;
exports.CreditRequestsService = CreditRequestsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(credit_request_entity_1.CreditRequest)),
    __param(1, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => events_service_1.EventsService))),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], CreditRequestsService);
//# sourceMappingURL=credit-requests.service.js.map