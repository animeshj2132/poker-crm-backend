import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { Table, TableStatus, TableType } from '../entities/table.entity';
import { Club } from '../club.entity';
import { EventsService } from '../../events/events.service';

@Injectable()
export class WaitlistSeatingService {
  constructor(
    @InjectRepository(WaitlistEntry) private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table) private readonly tableRepo: Repository<Table>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService?: EventsService
  ) {}

  // ========== Waitlist Operations ==========

  async createWaitlistEntry(clubId: string, data: {
    playerName: string;
    playerId?: string;
    phoneNumber?: string;
    email?: string;
    partySize?: number;
    priority?: number;
    notes?: string;
    tableType?: string;
  }) {
    if (!data.playerName || !data.playerName.trim()) {
      throw new BadRequestException('Player name is required');
    }
    if (data.partySize && data.partySize < 1) {
      throw new BadRequestException('Party size must be at least 1');
    }
    if (data.priority && (data.priority < 0 || data.priority > 100)) {
      throw new BadRequestException('Priority must be between 0 and 100');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

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
      status: WaitlistStatus.PENDING
    });

    return this.waitlistRepo.save(entry);
  }

  async getWaitlist(clubId: string, status?: WaitlistStatus) {
    const where: any = { club: { id: clubId } };
    if (status) where.status = status;

    return this.waitlistRepo.find({
      where,
      order: {
        priority: 'DESC',
        createdAt: 'ASC'
      }
    });
  }

  async getWaitlistEntry(clubId: string, entryId: string) {
    const entry = await this.waitlistRepo.findOne({
      where: { id: entryId, club: { id: clubId } }
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  async updateWaitlistEntry(clubId: string, entryId: string, data: {
    playerName?: string;
    phoneNumber?: string;
    email?: string;
    partySize?: number;
    priority?: number;
    notes?: string;
    tableType?: string;
  }) {
    const entry = await this.getWaitlistEntry(clubId, entryId);

    if (data.playerName !== undefined) {
      if (!data.playerName.trim()) {
        throw new BadRequestException('Player name cannot be empty');
      }
      entry.playerName = data.playerName.trim();
    }
    if (data.phoneNumber !== undefined) entry.phoneNumber = data.phoneNumber || null;
    if (data.email !== undefined) entry.email = data.email || null;
    if (data.partySize !== undefined) {
      if (data.partySize < 1) {
        throw new BadRequestException('Party size must be at least 1');
      }
      entry.partySize = data.partySize;
    }
    if (data.priority !== undefined) {
      if (data.priority < 0 || data.priority > 100) {
        throw new BadRequestException('Priority must be between 0 and 100');
      }
      entry.priority = data.priority;
    }
    if (data.notes !== undefined) entry.notes = data.notes || null;
    if (data.tableType !== undefined) entry.tableType = data.tableType || null;

    return this.waitlistRepo.save(entry);
  }

  async cancelWaitlistEntry(clubId: string, entryId: string) {
    const entry = await this.getWaitlistEntry(clubId, entryId);
    
    if (entry.status === WaitlistStatus.SEATED) {
      throw new BadRequestException('Cannot cancel a seated entry. Please unseat them first.');
    }
    if (entry.status === WaitlistStatus.CANCELLED) {
      throw new BadRequestException('Entry is already cancelled');
    }

    entry.status = WaitlistStatus.CANCELLED;
    entry.cancelledAt = new Date();
    const savedEntry = await this.waitlistRepo.save(entry);
    
    // Emit real-time event
    if (this.eventsService && entry.playerId) {
      this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
    }
    
    return savedEntry;
  }

  // ========== Seating Operations ==========

  async assignSeat(clubId: string, entryId: string, tableId: string, seatedBy: string) {
    const entry = await this.getWaitlistEntry(clubId, entryId);
    const table = await this.getTable(clubId, tableId);

    if (entry.status === WaitlistStatus.SEATED) {
      throw new BadRequestException('Entry is already seated');
    }
    if (entry.status === WaitlistStatus.CANCELLED) {
      throw new BadRequestException('Cannot seat a cancelled entry');
    }
    if (table.status !== TableStatus.AVAILABLE && table.status !== TableStatus.RESERVED) {
      throw new BadRequestException(`Table is ${table.status.toLowerCase()}. Cannot assign seat.`);
    }
    if (table.currentSeats + entry.partySize > table.maxSeats) {
      throw new BadRequestException(`Table only has ${table.maxSeats - table.currentSeats} available seats. Party size is ${entry.partySize}.`);
    }

    // Update table
    table.currentSeats += entry.partySize;
    if (table.currentSeats >= table.maxSeats) {
      table.status = TableStatus.OCCUPIED;
    } else {
      table.status = TableStatus.OCCUPIED;
    }

    // Update entry
    entry.status = WaitlistStatus.SEATED;
    entry.tableNumber = table.tableNumber;
    entry.seatedAt = new Date();
    entry.seatedBy = seatedBy;

    const savedTable = await this.tableRepo.save(table);
    const savedEntry = await this.waitlistRepo.save(entry);
    
    // Emit real-time events
    if (this.eventsService) {
      // Emit table status change
      this.eventsService.emitTableStatusChange(clubId, savedTable);
      
      // Emit waitlist status change for the player
      if (entry.playerId) {
        this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
      }
    }
    
    return savedEntry;
  }

  async unseatPlayer(clubId: string, entryId: string) {
    const entry = await this.getWaitlistEntry(clubId, entryId);

    if (entry.status !== WaitlistStatus.SEATED) {
      throw new BadRequestException('Entry is not currently seated');
    }
    if (!entry.tableNumber) {
      throw new BadRequestException('Entry has no table number assigned');
    }

    // Find and update table
    const table = await this.tableRepo.findOne({
      where: { club: { id: clubId }, tableNumber: entry.tableNumber }
    });

    if (table) {
      table.currentSeats = Math.max(0, table.currentSeats - entry.partySize);
      if (table.currentSeats === 0) {
        table.status = TableStatus.AVAILABLE;
      }
      const savedTable = await this.tableRepo.save(table);
      
      // Emit real-time event for table status change
      if (this.eventsService) {
        this.eventsService.emitTableStatusChange(clubId, savedTable);
      }
    }

    // Update entry
    entry.status = WaitlistStatus.PENDING;
    entry.tableNumber = null;
    entry.seatedAt = null;
    entry.seatedBy = null;

    const savedEntry = await this.waitlistRepo.save(entry);
    
    // Emit real-time event for waitlist status change
    if (this.eventsService && entry.playerId) {
      this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
    }
    
    return savedEntry;
  }

  // ========== Table Operations ==========

  async createTable(clubId: string, data: {
    tableNumber: number;
    tableType: TableType;
    maxSeats: number;
    minBuyIn?: number;
    maxBuyIn?: number;
    notes?: string;
  }) {
    if (!data.tableNumber || data.tableNumber < 1) {
      throw new BadRequestException('Table number must be a positive integer');
    }
    if (!data.maxSeats || data.maxSeats < 1) {
      throw new BadRequestException('Max seats must be at least 1');
    }
    if (data.minBuyIn !== undefined && data.minBuyIn < 0) {
      throw new BadRequestException('Min buy-in cannot be negative');
    }
    if (data.maxBuyIn !== undefined && data.maxBuyIn < 0) {
      throw new BadRequestException('Max buy-in cannot be negative');
    }
    if (data.minBuyIn !== undefined && data.maxBuyIn !== undefined && data.minBuyIn > data.maxBuyIn) {
      throw new BadRequestException('Min buy-in cannot be greater than max buy-in');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    // Check if table number already exists
    const existing = await this.tableRepo.findOne({
      where: { club: { id: clubId }, tableNumber: data.tableNumber }
    });
    if (existing) {
      throw new BadRequestException(`Table number ${data.tableNumber} already exists`);
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
      status: TableStatus.AVAILABLE
    });

    const savedTable = await this.tableRepo.save(table);
    
    // Emit real-time event
    if (this.eventsService) {
      this.eventsService.emitTableStatusChange(clubId, savedTable);
    }
    
    return savedTable;
  }

  async getTables(clubId: string, status?: TableStatus, tableType?: TableType) {
    const where: any = { club: { id: clubId } };
    if (status) where.status = status;
    if (tableType) where.tableType = tableType;

    return this.tableRepo.find({
      where,
      order: { tableNumber: 'ASC' }
    });
  }

  async getTable(clubId: string, tableId: string) {
    const table = await this.tableRepo.findOne({
      where: { id: tableId, club: { id: clubId } }
    });
    if (!table) throw new NotFoundException('Table not found');
    return table;
  }

  async updateTable(clubId: string, tableId: string, data: {
    tableType?: TableType;
    maxSeats?: number;
    status?: TableStatus;
    minBuyIn?: number;
    maxBuyIn?: number;
    notes?: string;
    reservedFor?: string;
    reservedUntil?: Date;
  }) {
    const table = await this.getTable(clubId, tableId);

    if (data.maxSeats !== undefined) {
      if (data.maxSeats < 1) {
        throw new BadRequestException('Max seats must be at least 1');
      }
      if (data.maxSeats < table.currentSeats) {
        throw new BadRequestException(`Cannot set max seats below current seats (${table.currentSeats})`);
      }
      table.maxSeats = data.maxSeats;
    }
    if (data.tableType !== undefined) table.tableType = data.tableType;
    if (data.status !== undefined) {
      if (data.status === TableStatus.AVAILABLE && table.currentSeats > 0) {
        throw new BadRequestException('Cannot set table to available when it has seated players');
      }
      table.status = data.status;
    }
    if (data.minBuyIn !== undefined) {
      if (data.minBuyIn < 0) {
        throw new BadRequestException('Min buy-in cannot be negative');
      }
      table.minBuyIn = data.minBuyIn;
    }
    if (data.maxBuyIn !== undefined) {
      if (data.maxBuyIn < 0) {
        throw new BadRequestException('Max buy-in cannot be negative');
      }
      table.maxBuyIn = data.maxBuyIn;
    }
    if (data.minBuyIn !== undefined && data.maxBuyIn !== undefined && data.minBuyIn > data.maxBuyIn) {
      throw new BadRequestException('Min buy-in cannot be greater than max buy-in');
    }
    if (data.notes !== undefined) table.notes = data.notes || null;
    if (data.reservedFor !== undefined) table.reservedFor = data.reservedFor || null;
    if (data.reservedUntil !== undefined) table.reservedUntil = data.reservedUntil || null;

    const savedTable = await this.tableRepo.save(table);
    
    // Emit real-time event
    if (this.eventsService) {
      this.eventsService.emitTableStatusChange(clubId, savedTable);
      
      // If table became available, notify waitlist
      if (savedTable.status === TableStatus.AVAILABLE) {
        this.eventsService.emitTableAvailableNotification(clubId, savedTable);
      }
    }
    
    return savedTable;
  }

  async deleteTable(clubId: string, tableId: string) {
    const table = await this.getTable(clubId, tableId);

    if (table.currentSeats > 0) {
      throw new BadRequestException('Cannot delete table with seated players');
    }
    if (table.status === TableStatus.OCCUPIED) {
      throw new BadRequestException('Cannot delete an occupied table');
    }

    await this.tableRepo.remove(table);
  }

  async deleteWaitlistEntry(clubId: string, entryId: string) {
    const entry = await this.getWaitlistEntry(clubId, entryId);
    
    if (entry.status === WaitlistStatus.SEATED) {
      throw new BadRequestException('Cannot delete a seated entry. Please unseat them first.');
    }

    await this.waitlistRepo.remove(entry);
  }

  // ========== Table Session Management ==========

  async updateTableStatus(clubId: string, tableId: string, status: TableStatus) {
    const table = await this.getTable(clubId, tableId);
    table.status = status;
    await this.tableRepo.save(table);
    return table;
  }

  async resetTableSeats(clubId: string, tableId: string) {
    const table = await this.getTable(clubId, tableId);
    table.currentSeats = 0;
    await this.tableRepo.save(table);
    return table;
  }

  async updateTableNotes(clubId: string, tableId: string, notes: string) {
    const table = await this.getTable(clubId, tableId);
    table.notes = notes;
    await this.tableRepo.save(table);
    return table;
  }
}

