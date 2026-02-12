import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WaitlistEntry, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { Table, TableStatus, TableType } from '../entities/table.entity';
import { Club } from '../club.entity';
import { Player } from '../entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import { EventsService } from '../../events/events.service';

@Injectable()
export class WaitlistSeatingService {
  constructor(
    @InjectRepository(WaitlistEntry) private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table) private readonly tableRepo: Repository<Table>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction) private readonly transactionRepo: Repository<FinancialTransaction>,
    private readonly dataSource: DataSource,
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
    requestedSeat?: number;
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

    // CRITICAL: Check if player is already in the waitlist (PENDING status only)
    if (data.playerId) {
      const existingEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId },
          playerId: data.playerId,
          status: WaitlistStatus.PENDING
        }
      });

      if (existingEntry) {
        throw new BadRequestException(
          `You are already on the waitlist (Position #${existingEntry.priority || 'N/A'}). ` +
          `Please wait to be seated or remove yourself from the waitlist before joining again.`
        );
      }
    }

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
      requestedSeat: data.requestedSeat || null,
      status: WaitlistStatus.PENDING
    });

    return this.waitlistRepo.save(entry);
  }

  async getWaitlist(clubId: string, status?: WaitlistStatus) {
    const where: any = { club: { id: clubId } };
    if (status) where.status = status;

    const entries = await this.waitlistRepo.find({
      where,
      order: {
        priority: 'DESC',
        createdAt: 'ASC'
      }
    });

    console.log('📋 [WAITLIST] Fetched entries:', entries.length);
    if (entries.length > 0) {
      console.log('📋 [WAITLIST] Sample entry:', entries[0]);
    }

    // Add position numbers to PENDING entries
    const pendingEntries = entries.filter(e => e.status === 'PENDING');
    return entries.map(entry => {
      if (entry.status === 'PENDING') {
        const position = pendingEntries.findIndex(e => e.id === entry.id) + 1;
        return { ...entry, position };
      }
      return { ...entry, position: null };
    });
  }

  async getWaitlistEntry(clubId: string, entryId: string) {
    const entry = await this.waitlistRepo.findOne({
      where: { id: entryId, club: { id: clubId } }
    });
    if (!entry) throw new NotFoundException('Waitlist entry not found');
    return entry;
  }

  async getSeatedPlayers(clubId: string) {
    const seatedEntries = await this.waitlistRepo.find({
      where: {
        club: { id: clubId },
        status: WaitlistStatus.SEATED,
      },
      order: { seatedAt: 'DESC' },
    });

    // Get table info for each seated player
    const seatedPlayersWithTables = await Promise.all(
      seatedEntries.map(async (entry) => {
        let table = null;
        if (entry.tableNumber) {
          table = await this.tableRepo.findOne({
            where: { club: { id: clubId }, tableNumber: entry.tableNumber },
          });
        }
        return {
          id: entry.playerId,
          name: entry.playerName,
          tableNumber: entry.tableNumber,
          tableName: table ? `Table ${table.tableNumber}` : `Table ${entry.tableNumber}`,
          tableId: table?.id,
          seatNumber: entry.requestedSeat,  // Fixed: Only use requestedSeat, not tableNumber as fallback
          seatedAt: entry.seatedAt,
          entryId: entry.id,
        };
      })
    );

    return seatedPlayersWithTables;
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

    // CRITICAL: Get player and take ALL their money for table
    if (!entry.playerId) {
      throw new BadRequestException('Cannot assign seat: Player ID is required');
    }

    const player = await this.playerRepo.findOne({
      where: { id: entry.playerId, club: { id: clubId } },
      relations: ['club']
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Calculate player's ENTIRE available balance (will take it all)
    // DEBUG: Check all transactions first
    const allTransactions = await this.dataSource.query(
      `SELECT id, type, amount, status, created_at FROM financial_transactions 
       WHERE club_id = $1 AND player_id = $2 
       ORDER BY created_at DESC`,
      [clubId, entry.playerId]
    );
    
    console.log(`🔍 [ASSIGN SEAT DEBUG] Player ${entry.playerName} (${entry.playerId}) ALL transactions:`, allTransactions);
    
    // Fixed: Use UPPER() for case-insensitive type and status checks
    const completedTransactions = await this.dataSource.query(
      `SELECT SUM(
        CASE 
          WHEN UPPER(type) IN ('DEPOSIT', 'CREDIT') THEN amount
          WHEN UPPER(type) IN ('WITHDRAWAL', 'CASHOUT', 'BUY_IN', 'DEBIT') THEN -amount
          ELSE 0
        END
      ) as total FROM financial_transactions 
      WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
      [clubId, entry.playerId]
    );

    const availableBalance = completedTransactions[0]?.total ? Number(completedTransactions[0].total) : 0;
    
    // CRITICAL: Check if player has credit available (for credit-only players)
    const creditEnabled = (player as any).creditEnabled || false;
    const creditLimit = Number((player as any).creditLimit || 0);
    
    // Calculate credit already used from approved credit requests
    let creditUsed = 0;
    if (creditEnabled) {
      const approvedRequests = await this.dataSource.query(
        `SELECT SUM(credit_limit) as total FROM credit_requests WHERE club_id = $1 AND player_id = $2 AND status = $3`,
        [clubId, entry.playerId, 'Approved']
      );
      creditUsed = approvedRequests[0]?.total ? Number(approvedRequests[0].total) : 0;
    }
    const availableCredit = creditEnabled ? Math.max(0, creditLimit - creditUsed) : 0;
    
    console.log(`🎯 [ASSIGN SEAT] Player ${entry.playerName} (${entry.playerId}) balance check:`);
    console.log(`   Available Cash Balance: ₹${availableBalance}`);
    console.log(`   Credit Enabled: ${creditEnabled}`);
    console.log(`   Credit Limit: ₹${creditLimit}`);
    console.log(`   Credit Used: ₹${creditUsed}`);
    console.log(`   Available Credit: ₹${availableCredit}`);
    console.log(`   Min Buy-in: ₹${table.minBuyIn || 0}`);

    // UPDATED LOGIC: Allow joining with either cash OR credit
    const minBuyIn = table.minBuyIn ? Number(table.minBuyIn) : 0;
    
    // Case 1: Has enough cash to meet minimum buy-in
    if (availableBalance >= minBuyIn) {
      console.log(`✅ [ASSIGN SEAT] Player has sufficient cash balance`);
    }
    // Case 2: Has credit available (can join with 0 cash and request credit after)
    else if (availableCredit > 0) {
      console.log(`✅ [ASSIGN SEAT] Player has no cash but has credit available - allowing to join with ₹0`);
    }
    // Case 3: Has neither cash nor credit - reject
    else {
      throw new BadRequestException(
        `Cannot join table. You need either ₹${minBuyIn.toFixed(2)} cash or approved credit. Your balance: ₹${availableBalance.toFixed(2)}, Available credit: ₹${availableCredit.toFixed(2)}`
      );
    }

    // Use database transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
    // Update table
    table.currentSeats += entry.partySize;
    if (table.currentSeats >= table.maxSeats) {
        table.status = TableStatus.OCCUPIED; // All seats filled
    } else {
        table.status = TableStatus.AVAILABLE; // Still has available seats
    }

    // Update entry
    entry.status = WaitlistStatus.SEATED;
    entry.tableNumber = table.tableNumber;
    entry.seatedAt = new Date();
    entry.seatedBy = seatedBy;

      const savedTable = await queryRunner.manager.save(table);
      const savedEntry = await queryRunner.manager.save(entry);

      // CRITICAL: Create buy-in transaction for ENTIRE cash balance (player brings all money to table)
      if (availableBalance > 0) {
        const buyInTransaction = queryRunner.manager.create(FinancialTransaction, {
          club: { id: clubId } as any,
          playerId: player.id,
          playerName: player.name,
          amount: availableBalance,
          type: TransactionType.BUY_IN,
          status: TransactionStatus.COMPLETED,
          notes: `Table buy-in - Table ${table.tableNumber}${entry.requestedSeat ? `, Seat ${entry.requestedSeat}` : ''} (Cash: ₹${availableBalance.toFixed(2)})`
        });

        await queryRunner.manager.save(buyInTransaction);
        console.log(`✅ [TABLE SEATING] Took cash balance ₹${availableBalance} from player ${player.name} for table`);
      }

      // CRITICAL: Auto-apply approved credit when joining table
      // If player has approved credit, automatically apply it to table balance
      if (availableCredit > 0) {
        const creditTransaction = queryRunner.manager.create(FinancialTransaction, {
          club: { id: clubId } as any,
          playerId: player.id,
          playerName: player.name,
          amount: availableCredit,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          notes: `Auto-applied approved credit on table join - Table ${table.tableNumber}${entry.requestedSeat ? `, Seat ${entry.requestedSeat}` : ''} (Credit: ₹${availableCredit.toFixed(2)})`
        });

        await queryRunner.manager.save(creditTransaction);
        console.log(`✅ [TABLE SEATING] Auto-applied approved credit ₹${availableCredit} for player ${player.name}`);
        console.log(`   Table Balance: ₹${availableBalance} cash + ₹${availableCredit} credit = ₹${availableBalance + availableCredit} total`);
      }

      await queryRunner.commitTransaction();
    
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
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
      status: TableStatus.AVAILABLE,
      // Rummy-specific fields (nullable, so poker tables are unaffected)
      rummyVariant: (data as any).rummyVariant || null,
      pointsValue: (data as any).pointsValue || null,
      numberOfDeals: (data as any).numberOfDeals || null,
      dropPoints: (data as any).dropPoints || null,
      maxPoints: (data as any).maxPoints || null,
      dealDuration: (data as any).dealDuration || null,
      entryFee: (data as any).entryFee || null,
      minPlayers: (data as any).minPlayers || null,
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
    // Rummy-specific fields
    rummyVariant?: string;
    pointsValue?: number;
    numberOfDeals?: number;
    dropPoints?: number;
    maxPoints?: number;
    dealDuration?: number;
    entryFee?: number;
    minPlayers?: number;
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

    // Update rummy-specific fields if provided
    if (data.rummyVariant !== undefined) table.rummyVariant = data.rummyVariant || null;
    if (data.pointsValue !== undefined) table.pointsValue = data.pointsValue || null;
    if (data.numberOfDeals !== undefined) table.numberOfDeals = data.numberOfDeals || null;
    if (data.dropPoints !== undefined) table.dropPoints = data.dropPoints || null;
    if (data.maxPoints !== undefined) table.maxPoints = data.maxPoints || null;
    if (data.dealDuration !== undefined) table.dealDuration = data.dealDuration || null;
    if (data.entryFee !== undefined) table.entryFee = data.entryFee || null;
    if (data.minPlayers !== undefined) table.minPlayers = data.minPlayers || null;

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

  async getSeatedPlayersForTable(clubId: string, tableId: string) {
    // Get the table first to get its table number
    const table = await this.getTable(clubId, tableId);
    if (!table) {
      throw new NotFoundException(`Table with ID ${tableId} not found`);
    }

    console.log(`[SEATED PLAYERS] Fetching for Table ${table.tableNumber} (ID: ${tableId})`);

    // Find all seated players for this table using table number
    const seatedEntries = await this.waitlistRepo.find({
      where: {
        club: { id: clubId },
        status: WaitlistStatus.SEATED,
        tableNumber: table.tableNumber,
      },
      order: { seatedAt: 'ASC' },
    });

    console.log(`[SEATED PLAYERS] Found ${seatedEntries.length} seated entries:`, 
      seatedEntries.map(e => ({ playerId: e.playerId, playerName: e.playerName, seat: e.requestedSeat })));

    // For each seated player, get their buy-in amount from financial transactions
    const seatedPlayersWithBuyIn = await Promise.all(
      seatedEntries.map(async (entry) => {
        let buyInAmount = 0;
        
        if (entry.playerId) {
          // Query to get total buy-in amount for this player at this table
          // Get all transactions for this player to debug
          const allTransactions = await this.waitlistRepo.manager.query(
            `SELECT id, type, amount, status, created_at, notes
             FROM financial_transactions
             WHERE player_id = $1
             ORDER BY created_at DESC
             LIMIT 5`,
            [entry.playerId]
          );
          
          console.log(`[DEBUG] All transactions for player ${entry.playerName}:`, allTransactions);
          
          // Sum all BUY_IN transactions for this player (don't filter by date for now)
          const result = await this.waitlistRepo.manager.query(
            `SELECT COALESCE(SUM(amount), 0) as total_buy_in
             FROM financial_transactions
             WHERE player_id = $1 
             AND type = 'Buy In'
             AND status = 'Completed'`,
            [entry.playerId]
          );
          
          buyInAmount = result && result.length > 0 ? parseFloat(result[0].total_buy_in) : 0;
          
          console.log(`[BUY-IN AMOUNT] Player: ${entry.playerName}, ID: ${entry.playerId}, Amount: ${buyInAmount}, Seated: ${entry.seatedAt}, Transactions found: ${allTransactions.length}`);
        }
        
        return {
          playerId: entry.playerId,
          playerName: entry.playerName || 'Unknown',
          seatNumber: entry.requestedSeat || null,
          seatedAt: entry.seatedAt,
          tableNumber: entry.tableNumber,
          buyInAmount: buyInAmount,
          sessionBuyInAmount: buyInAmount, // Add both for compatibility
        };
      })
    );

    return seatedPlayersWithBuyIn;
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

