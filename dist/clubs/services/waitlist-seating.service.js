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
exports.WaitlistSeatingService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const waitlist_entry_entity_1 = require("../entities/waitlist-entry.entity");
const table_entity_1 = require("../entities/table.entity");
const club_entity_1 = require("../club.entity");
const events_service_1 = require("../../events/events.service");
let WaitlistSeatingService = class WaitlistSeatingService {
    constructor(waitlistRepo, tableRepo, clubsRepo, eventsService) {
        this.waitlistRepo = waitlistRepo;
        this.tableRepo = tableRepo;
        this.clubsRepo = clubsRepo;
        this.eventsService = eventsService;
    }
    async createWaitlistEntry(clubId, data) {
        if (!data.playerName || !data.playerName.trim()) {
            throw new common_1.BadRequestException('Player name is required');
        }
        if (data.partySize && data.partySize < 1) {
            throw new common_1.BadRequestException('Party size must be at least 1');
        }
        if (data.priority && (data.priority < 0 || data.priority > 100)) {
            throw new common_1.BadRequestException('Priority must be between 0 and 100');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const entry = this.waitlistRepo.create({
            club,
            playerName: data.playerName.trim(),
            playerId: data.playerId || null,
            phoneNumber: data.phoneNumber || null,
            email: data.email || null,
            partySize: data.partySize || 1,
            priority: data.priority || 0,
            notes: data.notes || null,
            tableType: data.tableType || null,
            status: waitlist_entry_entity_1.WaitlistStatus.PENDING
        });
        return this.waitlistRepo.save(entry);
    }
    async getWaitlist(clubId, status) {
        const where = { club: { id: clubId } };
        if (status)
            where.status = status;
        return this.waitlistRepo.find({
            where,
            order: {
                priority: 'DESC',
                createdAt: 'ASC'
            }
        });
    }
    async getWaitlistEntry(clubId, entryId) {
        const entry = await this.waitlistRepo.findOne({
            where: { id: entryId, club: { id: clubId } }
        });
        if (!entry)
            throw new common_1.NotFoundException('Waitlist entry not found');
        return entry;
    }
    async updateWaitlistEntry(clubId, entryId, data) {
        const entry = await this.getWaitlistEntry(clubId, entryId);
        if (data.playerName !== undefined) {
            if (!data.playerName.trim()) {
                throw new common_1.BadRequestException('Player name cannot be empty');
            }
            entry.playerName = data.playerName.trim();
        }
        if (data.phoneNumber !== undefined)
            entry.phoneNumber = data.phoneNumber || null;
        if (data.email !== undefined)
            entry.email = data.email || null;
        if (data.partySize !== undefined) {
            if (data.partySize < 1) {
                throw new common_1.BadRequestException('Party size must be at least 1');
            }
            entry.partySize = data.partySize;
        }
        if (data.priority !== undefined) {
            if (data.priority < 0 || data.priority > 100) {
                throw new common_1.BadRequestException('Priority must be between 0 and 100');
            }
            entry.priority = data.priority;
        }
        if (data.notes !== undefined)
            entry.notes = data.notes || null;
        if (data.tableType !== undefined)
            entry.tableType = data.tableType || null;
        return this.waitlistRepo.save(entry);
    }
    async cancelWaitlistEntry(clubId, entryId) {
        const entry = await this.getWaitlistEntry(clubId, entryId);
        if (entry.status === waitlist_entry_entity_1.WaitlistStatus.SEATED) {
            throw new common_1.BadRequestException('Cannot cancel a seated entry. Please unseat them first.');
        }
        if (entry.status === waitlist_entry_entity_1.WaitlistStatus.CANCELLED) {
            throw new common_1.BadRequestException('Entry is already cancelled');
        }
        entry.status = waitlist_entry_entity_1.WaitlistStatus.CANCELLED;
        entry.cancelledAt = new Date();
        const savedEntry = await this.waitlistRepo.save(entry);
        if (this.eventsService && entry.playerId) {
            this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
        }
        return savedEntry;
    }
    async assignSeat(clubId, entryId, tableId, seatedBy) {
        const entry = await this.getWaitlistEntry(clubId, entryId);
        const table = await this.getTable(clubId, tableId);
        if (entry.status === waitlist_entry_entity_1.WaitlistStatus.SEATED) {
            throw new common_1.BadRequestException('Entry is already seated');
        }
        if (entry.status === waitlist_entry_entity_1.WaitlistStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot seat a cancelled entry');
        }
        if (table.status !== table_entity_1.TableStatus.AVAILABLE && table.status !== table_entity_1.TableStatus.RESERVED) {
            throw new common_1.BadRequestException(`Table is ${table.status.toLowerCase()}. Cannot assign seat.`);
        }
        if (table.currentSeats + entry.partySize > table.maxSeats) {
            throw new common_1.BadRequestException(`Table only has ${table.maxSeats - table.currentSeats} available seats. Party size is ${entry.partySize}.`);
        }
        table.currentSeats += entry.partySize;
        if (table.currentSeats >= table.maxSeats) {
            table.status = table_entity_1.TableStatus.OCCUPIED;
        }
        else {
            table.status = table_entity_1.TableStatus.OCCUPIED;
        }
        entry.status = waitlist_entry_entity_1.WaitlistStatus.SEATED;
        entry.tableNumber = table.tableNumber;
        entry.seatedAt = new Date();
        entry.seatedBy = seatedBy;
        const savedTable = await this.tableRepo.save(table);
        const savedEntry = await this.waitlistRepo.save(entry);
        if (this.eventsService) {
            this.eventsService.emitTableStatusChange(clubId, savedTable);
            if (entry.playerId) {
                this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
            }
        }
        return savedEntry;
    }
    async unseatPlayer(clubId, entryId) {
        const entry = await this.getWaitlistEntry(clubId, entryId);
        if (entry.status !== waitlist_entry_entity_1.WaitlistStatus.SEATED) {
            throw new common_1.BadRequestException('Entry is not currently seated');
        }
        if (!entry.tableNumber) {
            throw new common_1.BadRequestException('Entry has no table number assigned');
        }
        const table = await this.tableRepo.findOne({
            where: { club: { id: clubId }, tableNumber: entry.tableNumber }
        });
        if (table) {
            table.currentSeats = Math.max(0, table.currentSeats - entry.partySize);
            if (table.currentSeats === 0) {
                table.status = table_entity_1.TableStatus.AVAILABLE;
            }
            const savedTable = await this.tableRepo.save(table);
            if (this.eventsService) {
                this.eventsService.emitTableStatusChange(clubId, savedTable);
            }
        }
        entry.status = waitlist_entry_entity_1.WaitlistStatus.PENDING;
        entry.tableNumber = null;
        entry.seatedAt = null;
        entry.seatedBy = null;
        const savedEntry = await this.waitlistRepo.save(entry);
        if (this.eventsService && entry.playerId) {
            this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
        }
        return savedEntry;
    }
    async createTable(clubId, data) {
        if (!data.tableNumber || data.tableNumber < 1) {
            throw new common_1.BadRequestException('Table number must be a positive integer');
        }
        if (!data.maxSeats || data.maxSeats < 1) {
            throw new common_1.BadRequestException('Max seats must be at least 1');
        }
        if (data.minBuyIn !== undefined && data.minBuyIn < 0) {
            throw new common_1.BadRequestException('Min buy-in cannot be negative');
        }
        if (data.maxBuyIn !== undefined && data.maxBuyIn < 0) {
            throw new common_1.BadRequestException('Max buy-in cannot be negative');
        }
        if (data.minBuyIn !== undefined && data.maxBuyIn !== undefined && data.minBuyIn > data.maxBuyIn) {
            throw new common_1.BadRequestException('Min buy-in cannot be greater than max buy-in');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const existing = await this.tableRepo.findOne({
            where: { club: { id: clubId }, tableNumber: data.tableNumber }
        });
        if (existing) {
            throw new common_1.BadRequestException(`Table number ${data.tableNumber} already exists`);
        }
        const table = this.tableRepo.create({
            club,
            tableNumber: data.tableNumber,
            tableType: data.tableType,
            maxSeats: data.maxSeats,
            currentSeats: 0,
            minBuyIn: data.minBuyIn || null,
            maxBuyIn: data.maxBuyIn || null,
            notes: data.notes || null,
            status: table_entity_1.TableStatus.AVAILABLE
        });
        const savedTable = await this.tableRepo.save(table);
        if (this.eventsService) {
            this.eventsService.emitTableStatusChange(clubId, savedTable);
        }
        return savedTable;
    }
    async getTables(clubId, status, tableType) {
        const where = { club: { id: clubId } };
        if (status)
            where.status = status;
        if (tableType)
            where.tableType = tableType;
        return this.tableRepo.find({
            where,
            order: { tableNumber: 'ASC' }
        });
    }
    async getTable(clubId, tableId) {
        const table = await this.tableRepo.findOne({
            where: { id: tableId, club: { id: clubId } }
        });
        if (!table)
            throw new common_1.NotFoundException('Table not found');
        return table;
    }
    async updateTable(clubId, tableId, data) {
        const table = await this.getTable(clubId, tableId);
        if (data.maxSeats !== undefined) {
            if (data.maxSeats < 1) {
                throw new common_1.BadRequestException('Max seats must be at least 1');
            }
            if (data.maxSeats < table.currentSeats) {
                throw new common_1.BadRequestException(`Cannot set max seats below current seats (${table.currentSeats})`);
            }
            table.maxSeats = data.maxSeats;
        }
        if (data.tableType !== undefined)
            table.tableType = data.tableType;
        if (data.status !== undefined) {
            if (data.status === table_entity_1.TableStatus.AVAILABLE && table.currentSeats > 0) {
                throw new common_1.BadRequestException('Cannot set table to available when it has seated players');
            }
            table.status = data.status;
        }
        if (data.minBuyIn !== undefined) {
            if (data.minBuyIn < 0) {
                throw new common_1.BadRequestException('Min buy-in cannot be negative');
            }
            table.minBuyIn = data.minBuyIn;
        }
        if (data.maxBuyIn !== undefined) {
            if (data.maxBuyIn < 0) {
                throw new common_1.BadRequestException('Max buy-in cannot be negative');
            }
            table.maxBuyIn = data.maxBuyIn;
        }
        if (data.minBuyIn !== undefined && data.maxBuyIn !== undefined && data.minBuyIn > data.maxBuyIn) {
            throw new common_1.BadRequestException('Min buy-in cannot be greater than max buy-in');
        }
        if (data.notes !== undefined)
            table.notes = data.notes || null;
        if (data.reservedFor !== undefined)
            table.reservedFor = data.reservedFor || null;
        if (data.reservedUntil !== undefined)
            table.reservedUntil = data.reservedUntil || null;
        const savedTable = await this.tableRepo.save(table);
        if (this.eventsService) {
            this.eventsService.emitTableStatusChange(clubId, savedTable);
            if (savedTable.status === table_entity_1.TableStatus.AVAILABLE) {
                this.eventsService.emitTableAvailableNotification(clubId, savedTable);
            }
        }
        return savedTable;
    }
    async deleteTable(clubId, tableId) {
        const table = await this.getTable(clubId, tableId);
        if (table.currentSeats > 0) {
            throw new common_1.BadRequestException('Cannot delete table with seated players');
        }
        if (table.status === table_entity_1.TableStatus.OCCUPIED) {
            throw new common_1.BadRequestException('Cannot delete an occupied table');
        }
        await this.tableRepo.remove(table);
    }
    async deleteWaitlistEntry(clubId, entryId) {
        const entry = await this.getWaitlistEntry(clubId, entryId);
        if (entry.status === waitlist_entry_entity_1.WaitlistStatus.SEATED) {
            throw new common_1.BadRequestException('Cannot delete a seated entry. Please unseat them first.');
        }
        await this.waitlistRepo.remove(entry);
    }
};
exports.WaitlistSeatingService = WaitlistSeatingService;
exports.WaitlistSeatingService = WaitlistSeatingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntry)),
    __param(1, (0, typeorm_1.InjectRepository)(table_entity_1.Table)),
    __param(2, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => events_service_1.EventsService))),
    __param(3, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        events_service_1.EventsService])
], WaitlistSeatingService);
//# sourceMappingURL=waitlist-seating.service.js.map