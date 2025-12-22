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
exports.FinancialTransactionsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const financial_transaction_entity_1 = require("../entities/financial-transaction.entity");
const club_entity_1 = require("../club.entity");
let FinancialTransactionsService = class FinancialTransactionsService {
    constructor(transactionsRepo, clubsRepo) {
        this.transactionsRepo = transactionsRepo;
        this.clubsRepo = clubsRepo;
    }
    async create(clubId, data) {
        var _a;
        if (!data.type) {
            throw new common_1.BadRequestException('Transaction type is required');
        }
        if (!Object.values(financial_transaction_entity_1.TransactionType).includes(data.type)) {
            throw new common_1.BadRequestException('Invalid transaction type');
        }
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
        const transaction = this.transactionsRepo.create({
            type: data.type,
            playerId: data.playerId.trim(),
            playerName: data.playerName.trim(),
            amount: data.amount,
            notes: ((_a = data.notes) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            status: financial_transaction_entity_1.TransactionStatus.PENDING,
            club
        });
        return this.transactionsRepo.save(transaction);
    }
    async findAll(clubId, status) {
        const where = { club: { id: clubId } };
        if (status)
            where.status = status;
        return this.transactionsRepo.find({
            where,
            order: { createdAt: 'DESC' }
        });
    }
    async findOne(id, clubId) {
        const transaction = await this.transactionsRepo.findOne({
            where: { id, club: { id: clubId } }
        });
        if (!transaction)
            throw new common_1.NotFoundException('Transaction not found');
        return transaction;
    }
    async update(id, clubId, data) {
        var _a;
        const transaction = await this.findOne(id, clubId);
        if (transaction.status === financial_transaction_entity_1.TransactionStatus.CANCELLED) {
            throw new common_1.ConflictException('Cannot update a cancelled transaction');
        }
        if (transaction.status === financial_transaction_entity_1.TransactionStatus.COMPLETED && data.amount !== undefined) {
            throw new common_1.ConflictException('Cannot update amount of a completed transaction');
        }
        if (data.amount !== undefined) {
            if (typeof data.amount !== 'number' || isNaN(data.amount)) {
                throw new common_1.BadRequestException('Amount must be a valid number');
            }
            if (data.amount <= 0) {
                throw new common_1.BadRequestException('Amount must be greater than 0');
            }
            if (data.amount > 100000000) {
                throw new common_1.BadRequestException('Amount exceeds maximum limit of ₹100,000,000');
            }
        }
        if (data.notes !== undefined) {
            if (data.notes && data.notes.trim().length > 500) {
                throw new common_1.BadRequestException('Notes cannot exceed 500 characters');
            }
            data.notes = (((_a = data.notes) === null || _a === void 0 ? void 0 : _a.trim()) || undefined);
        }
        if (data.status !== undefined) {
            if (!Object.values(financial_transaction_entity_1.TransactionStatus).includes(data.status)) {
                throw new common_1.BadRequestException('Invalid transaction status');
            }
            if (transaction.status === financial_transaction_entity_1.TransactionStatus.COMPLETED && data.status !== financial_transaction_entity_1.TransactionStatus.COMPLETED) {
                throw new common_1.ConflictException('Cannot change status of a completed transaction');
            }
        }
        Object.assign(transaction, data);
        return this.transactionsRepo.save(transaction);
    }
    async cancel(id, clubId) {
        const transaction = await this.findOne(id, clubId);
        if (transaction.status === financial_transaction_entity_1.TransactionStatus.CANCELLED) {
            throw new common_1.ConflictException('Transaction has already been cancelled');
        }
        if (transaction.status === financial_transaction_entity_1.TransactionStatus.COMPLETED) {
            throw new common_1.ConflictException('Cannot cancel a completed transaction');
        }
        transaction.status = financial_transaction_entity_1.TransactionStatus.CANCELLED;
        return this.transactionsRepo.save(transaction);
    }
};
exports.FinancialTransactionsService = FinancialTransactionsService;
exports.FinancialTransactionsService = FinancialTransactionsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(financial_transaction_entity_1.FinancialTransaction)),
    __param(1, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], FinancialTransactionsService);
//# sourceMappingURL=financial-transactions.service.js.map