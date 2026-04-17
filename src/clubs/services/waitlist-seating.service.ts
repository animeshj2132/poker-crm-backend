import { BadRequestException, Injectable, NotFoundException, Inject, forwardRef, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WaitlistEntry, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { Table, TableStatus, TableType } from '../entities/table.entity';
import { Club } from '../club.entity';
import { Player } from '../entities/player.entity';
import {
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
  WALLET_BALANCE_SQL,
  CREDIT_BALANCE_SQL,
  SESSION_TABLE_CHIPS_SUM_CASE_INNER,
  TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER,
} from '../entities/financial-transaction.entity';
import { EventsService } from '../../events/events.service';
import { computeCreditFacilityBreakdown, sumApprovedCreditLimitSince } from '../credit-used.util';
import { tableHasActiveStaffSession } from '../table-session.util';
import { playerMeetsTableMinBuyIn } from '../waitlist-buyin.util';

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
    requestedGameType?: 'POKER' | 'RUMMY';
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
      requestedGameType: data.requestedGameType || null,
      requestedSeat: data.requestedSeat || null,
      status: WaitlistStatus.PENDING
    });

    const savedEntry = await this.waitlistRepo.save(entry);

    // Emit real-time event so staff and player apps update instantly on new waitlist entry.
    if (this.eventsService) {
      this.eventsService.emitWaitlistStatusChange(savedEntry.playerId || null, clubId, savedEntry);
    }

    return savedEntry;
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
          seatNumber: entry.assignedSeat ?? entry.requestedSeat,
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

  async assignSeat(clubId: string, entryId: string, tableId: string, seatedBy: string, assignedSeat?: number) {
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

    // CRITICAL: Poker and Rummy are separate — only allow assigning to a table that matches the request
    const requestedGame = (entry as any).requestedGameType?.toUpperCase?.() || 'POKER';
    const isRummyTable = String(table.tableType || '').toUpperCase() === 'RUMMY';
    console.log(`🎯 [ASSIGN SEAT] Entry ${entry.id} requestedGame=${requestedGame}, table ${table.tableNumber} tableType=${table.tableType} isRummyTable=${isRummyTable}`);
    if (requestedGame === 'RUMMY' && !isRummyTable) {
      throw new BadRequestException('This waitlist request is for a Rummy table. Please assign to a Rummy table only.');
    }
    if (requestedGame === 'POKER' && isRummyTable) {
      throw new BadRequestException('This waitlist request is for a Poker table. Please assign to a Poker table only. You selected a Rummy table.');
    }

    if (!entry.playerId) {
      throw new BadRequestException('Cannot assign seat: Player ID is required');
    }

    // Use database transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Re-read and lock both records inside the transaction to prevent race conditions.
      const lockedEntry = await queryRunner.manager.findOne(WaitlistEntry, {
        where: { id: entryId, club: { id: clubId } },
        lock: { mode: 'pessimistic_write' },
      });
      const lockedTable = await queryRunner.manager.findOne(Table, {
        where: { id: tableId, club: { id: clubId } },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedEntry) {
        throw new NotFoundException('Waitlist entry not found');
      }
      if (!lockedTable) {
        throw new NotFoundException('Table not found');
      }

      if (lockedEntry.status === WaitlistStatus.SEATED) {
        throw new BadRequestException('Entry is already seated');
      }
      if (lockedEntry.status === WaitlistStatus.CANCELLED) {
        throw new BadRequestException('Cannot seat a cancelled entry');
      }
      if (lockedTable.status !== TableStatus.AVAILABLE && lockedTable.status !== TableStatus.RESERVED) {
        throw new BadRequestException(`Table is ${lockedTable.status.toLowerCase()}. Cannot assign seat.`);
      }
      if (lockedTable.currentSeats + lockedEntry.partySize > lockedTable.maxSeats) {
        throw new BadRequestException(`Table only has ${lockedTable.maxSeats - lockedTable.currentSeats} available seats. Party size is ${lockedEntry.partySize}.`);
      }
      if (!tableHasActiveStaffSession(lockedTable.notes)) {
        throw new BadRequestException(
          'This table has no active session (it may have just ended). Refresh the waitlist and try again.',
        );
      }

      const effectiveSeat =
        assignedSeat != null && Number.isFinite(Number(assignedSeat))
          ? Number(assignedSeat)
          : lockedEntry.requestedSeat;

      // Prevent two players getting assigned to the same seat on the same table.
      if (effectiveSeat != null) {
        const occupiedSeat = await queryRunner.manager.findOne(WaitlistEntry, {
          where: {
            club: { id: clubId },
            tableNumber: lockedTable.tableNumber,
            status: WaitlistStatus.SEATED,
            assignedSeat: effectiveSeat,
          },
          lock: { mode: 'pessimistic_read' },
        });

        if (occupiedSeat && occupiedSeat.id !== lockedEntry.id) {
          throw new BadRequestException(`Seat ${effectiveSeat} is already assigned on Table ${lockedTable.tableNumber}`);
        }
      }

      const lockedPlayer = await queryRunner.manager.findOne(Player, {
        where: { id: lockedEntry.playerId!, club: { id: clubId } },
        relations: ['club'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedPlayer) {
        throw new NotFoundException('Player not found');
      }

      const walletRows = await queryRunner.manager.query(
        `SELECT ${WALLET_BALANCE_SQL} as total FROM financial_transactions 
         WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
        [clubId, lockedEntry.playerId],
      );
      const availableBalance = walletRows[0]?.total ? Number(walletRows[0].total) : 0;

      const creditEnabled = (lockedPlayer as any).creditEnabled || false;
      const creditLimit = Number((lockedPlayer as any).creditLimit || 0);
      let creditUsed = 0;
      if (creditEnabled) {
        creditUsed = await sumApprovedCreditLimitSince(
          (sql, p) => queryRunner.manager.query(sql, p),
          clubId,
          lockedEntry.playerId!,
          (lockedPlayer as any).creditEnabledAt,
        );
        creditUsed = Math.min(Math.max(0, creditUsed), creditLimit);
      }
      let creditLedgerNet = 0;
      if (creditEnabled) {
        try {
          const crRows = await queryRunner.manager.query(
            `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions
             WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
            [clubId, lockedEntry.playerId],
          );
          creditLedgerNet = Number(crRows?.[0]?.total ?? 0);
        } catch {
          creditLedgerNet = 0;
        }
      }
      const { availableCredit, effectiveCreditOnLine } = computeCreditFacilityBreakdown({
        creditLimit,
        creditUsedFromApprovals: creditUsed,
        creditLedgerNet,
        availableBalance,
        creditEnabled,
      });
      const ledgerHeadroomForNewCredit = Math.max(0, creditLimit - Math.max(0, creditLedgerNet));

      const minBuyIn = Math.max(0, Number(lockedTable.minBuyIn) || 0);
      const maxBuyInRaw = Number(lockedTable.maxBuyIn);
      const maxBuyInCap = Number.isFinite(maxBuyInRaw) && maxBuyInRaw > 0 ? maxBuyInRaw : null;

      // Hard stop: negative wallet means player still owes cashier/club.
      if (availableBalance < 0) {
        throw new BadRequestException(
          `Cannot join table while wallet is negative (₹${availableBalance.toLocaleString('en-IN')}). Please repay at the cashier first.`,
        );
      }

      // For min-buy-in check: wallet + on-line credit counts (on-line = already approved & drawn).
      // Credit remaining is NOT counted — it only gets drawn when player explicitly requests it.
      const creditOnLineForCheck = Math.max(0, Number(effectiveCreditOnLine) || 0);
      if (!playerMeetsTableMinBuyIn(availableBalance, creditOnLineForCheck, minBuyIn)) {
        const w = availableBalance;
        const reason =
          w < 0
            ? `Your wallet is negative (₹${w.toLocaleString('en-IN')}). Please repay at the cashier first.`
            : `Wallet: ₹${w.toLocaleString('en-IN')}, credit on line: ₹${creditOnLineForCheck.toLocaleString('en-IN')}.`;
        throw new BadRequestException(
          `Cannot join table. Minimum buy-in is ₹${minBuyIn.toLocaleString('en-IN')}. ${reason}`,
        );
      }

      // Move all positive wallet cash to the table first.
      const cashToTablePreview = Math.max(0, availableBalance);
      // Auto-apply ONLY credit already on-line (approved & drawn by player request).
      // Credit remaining stays as remaining until player explicitly requests it — never auto-applied.
      const roomUnderMaxBuy =
        maxBuyInCap != null ? Math.max(0, maxBuyInCap - cashToTablePreview) : Number.POSITIVE_INFINITY;
      const creditToApplyOnJoin = Math.min(
        roomUnderMaxBuy,
        creditOnLineForCheck,
        ledgerHeadroomForNewCredit,
      );

      const totalOpeningChips = cashToTablePreview + creditToApplyOnJoin;
      if (minBuyIn > 0 && totalOpeningChips + 0.0001 < minBuyIn) {
        throw new BadRequestException(
          `Cannot join table. Minimum buy-in is ₹${minBuyIn.toLocaleString('en-IN')}, but only ₹${totalOpeningChips.toLocaleString('en-IN')} can be placed from your wallet and drawable credit line headroom. Ask staff to adjust your line or add cash.`,
        );
      }

      console.log(`🎯 [ASSIGN SEAT] Player ${lockedEntry.playerName} (${lockedEntry.playerId}) balance check (locked):`);
      console.log(`   Available Cash Balance: ₹${availableBalance}`);
      console.log(`   Credit Enabled: ${creditEnabled}`);
      console.log(
        `   Credit on line (will apply to table): ₹${creditOnLineForCheck}; credit remaining (not auto-applied): ₹${availableCredit}; ledger headroom: ₹${ledgerHeadroomForNewCredit}; applying on join: ₹${creditToApplyOnJoin}`,
      );
      console.log(`   Min Buy-in: ₹${minBuyIn}`);

      // Update table
      lockedTable.currentSeats += lockedEntry.partySize;
      if (lockedTable.currentSeats >= lockedTable.maxSeats) {
        lockedTable.status = TableStatus.OCCUPIED; // All seats filled
      } else {
        lockedTable.status = TableStatus.AVAILABLE; // Still has available seats
      }

      // Update entry — one anchor instant for seated_at and opening ledger rows so
      // session math (created_at >= seated_at) never misses same-moment buy-in/credit.
      const sessionAnchor = new Date();
      lockedEntry.status = WaitlistStatus.SEATED;
      lockedEntry.tableNumber = lockedTable.tableNumber;
      lockedEntry.assignedSeat = effectiveSeat;
      lockedEntry.seatedAt = sessionAnchor;
      lockedEntry.seatedBy = seatedBy;

      const savedTable = await queryRunner.manager.save(lockedTable);
      const savedEntry = await queryRunner.manager.save(lockedEntry);

      const gameType = (lockedTable as any).tableType === 'RUMMY' ? 'rummy' : 'poker';

      // Transfer cash from wallet to table (only if wallet > 0)
      const cashToTable = Math.max(0, availableBalance);
      if (cashToTable > 0) {
        const tableBuyIn = queryRunner.manager.create(FinancialTransaction, {
          club: { id: clubId } as any,
          playerId: lockedPlayer.id,
          playerName: lockedPlayer.name,
          amount: cashToTable,
          type: TransactionType.TABLE_BUY_IN,
          status: TransactionStatus.COMPLETED,
          gameType,
          notes: `Table buy-in - Table ${lockedTable.tableNumber}${effectiveSeat ? `, Seat ${effectiveSeat}` : ''} (Cash: ₹${cashToTable.toFixed(2)})`
        });
        (tableBuyIn as any).createdAt = sessionAnchor;
        (tableBuyIn as any).updatedAt = sessionAnchor;

        await queryRunner.manager.save(tableBuyIn);
        console.log(`✅ [TABLE SEATING] Moved ₹${cashToTable} from wallet to table for player ${lockedPlayer.name} (${gameType})`);
      }

      // Auto-apply approved credit as table balance
      if (creditToApplyOnJoin > 0) {
        const creditTransaction = queryRunner.manager.create(FinancialTransaction, {
          club: { id: clubId } as any,
          playerId: lockedPlayer.id,
          playerName: lockedPlayer.name,
          amount: creditToApplyOnJoin,
          type: TransactionType.CREDIT,
          status: TransactionStatus.COMPLETED,
          gameType,
          notes: `Credit applied on table join - Table ${lockedTable.tableNumber}${effectiveSeat ? `, Seat ${effectiveSeat}` : ''} (Credit: ₹${creditToApplyOnJoin.toFixed(2)})`
        });
        (creditTransaction as any).createdAt = sessionAnchor;
        (creditTransaction as any).updatedAt = sessionAnchor;

        await queryRunner.manager.save(creditTransaction);
        const walletPairNote = `Table buy-in — credit line to table — Table ${lockedTable.tableNumber}${effectiveSeat ? `, Seat ${effectiveSeat}` : ''} (${TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER}) — pairs with credit applied on join ₹${creditToApplyOnJoin.toFixed(2)}`;
        const walletPairTbi = queryRunner.manager.create(FinancialTransaction, {
          club: { id: clubId } as any,
          playerId: lockedPlayer.id,
          playerName: lockedPlayer.name,
          amount: creditToApplyOnJoin,
          type: TransactionType.TABLE_BUY_IN,
          status: TransactionStatus.COMPLETED,
          gameType,
          notes: walletPairNote,
        });
        (walletPairTbi as any).createdAt = sessionAnchor;
        (walletPairTbi as any).updatedAt = sessionAnchor;
        await queryRunner.manager.save(walletPairTbi);
        console.log(`✅ [TABLE SEATING] Applied credit ₹${creditToApplyOnJoin} for player ${lockedPlayer.name}`);
      }

      console.log(
        `   Table Balance: ₹${cashToTable} cash + ₹${creditToApplyOnJoin} credit = ₹${cashToTable + creditToApplyOnJoin} total`,
      );

      await queryRunner.commitTransaction();
    
    // Emit real-time events
    if (this.eventsService) {
      // Emit table status change
      this.eventsService.emitTableStatusChange(clubId, savedTable);
      
      // Emit waitlist status change for the player
      if (savedEntry.playerId) {
        this.eventsService.emitWaitlistStatusChange(savedEntry.playerId, clubId, savedEntry);
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

  /**
   * @param options.requeue When true (default), player returns to the waitlist queue (PENDING).
   *   When false — e.g. cashier buy-out — entry is closed (CANCELLED) so they are not shown as waiting.
   */
  async unseatPlayer(clubId: string, entryId: string, options?: { requeue?: boolean }) {
    const requeue = options?.requeue !== false;
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

    // Update entry — PENDING re-queues; CANCELLED ends the visit (buy-out / leave floor)
    if (requeue) {
      entry.status = WaitlistStatus.PENDING;
      entry.cancelledAt = null;
    } else {
      entry.status = WaitlistStatus.CANCELLED;
      entry.cancelledAt = new Date();
    }
    entry.tableNumber = null;
    entry.seatedAt = null;
    entry.seatedBy = null;

    const savedEntry = await this.waitlistRepo.save(entry);
    
    // Emit real-time event for waitlist status change
    if (this.eventsService && entry.playerId) {
      this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, savedEntry);
      this.eventsService.emitBalanceUpdated(clubId, entry.playerId);
      this.eventsService.emitPlayerUpdated(clubId, entry.playerId);
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

    // Notify player app immediately so waitlist UI clears without refresh.
    if (this.eventsService && entry.playerId) {
      this.eventsService.emitWaitlistStatusChange(entry.playerId, clubId, {
        ...entry,
        status: WaitlistStatus.CANCELLED,
        cancelledAt: new Date(),
      });
    }
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

    // For each seated player, get their buy-in amount from financial transactions (current session only)
    const seatedPlayersWithBuyIn = await Promise.all(
      seatedEntries.map(async (entry) => {
        const seatedAt = entry.seatedAt || new Date(0);
        const fromTime = seatedAt instanceof Date ? seatedAt : new Date(seatedAt);
        let buyInAmount = 0;

        if (entry.playerId) {
          // Calculate NET table balance for current session (since seated_at), for this club only — exact boundary.
          const result = await this.waitlistRepo.manager.query(
            `SELECT COALESCE(SUM(
               CASE
                 ${SESSION_TABLE_CHIPS_SUM_CASE_INNER}
               END
             ), 0) as table_balance
             FROM financial_transactions
             WHERE club_id = $1
             AND player_id = $2 
             AND UPPER(status) = 'COMPLETED'
             AND created_at >= $3`,
            [clubId, entry.playerId, fromTime]
          );
          
          buyInAmount = result && result.length > 0 ? Math.max(0, parseFloat(result[0].table_balance)) : 0;
          
          console.log(`[TABLE BALANCE] Player: ${entry.playerName}, ID: ${entry.playerId}, Seated: ${seatedAt}, Balance: ${buyInAmount}`);
        }
        
        // Wallet balance = real money not on table (can be negative)
        let walletBalance = 0;
        if (entry.playerId) {
          const balanceResult = await this.waitlistRepo.manager.query(
            `SELECT ${WALLET_BALANCE_SQL} as total FROM financial_transactions 
            WHERE player_id = $1 AND UPPER(status) = 'COMPLETED'`,
            [entry.playerId]
          );
          walletBalance = balanceResult && balanceResult.length > 0 ? parseFloat(balanceResult[0].total) || 0 : 0;
        }

        // Outstanding credit balance (credit given - credit paid back)
        let totalCredits = 0;
        if (entry.playerId) {
          const creditsResult = await this.waitlistRepo.manager.query(
            `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions
             WHERE player_id = $1 AND UPPER(status) = 'COMPLETED'`,
            [entry.playerId]
          );
          totalCredits = creditsResult && creditsResult.length > 0 ? parseFloat(creditsResult[0].total) || 0 : 0;
        }

        let creditFacilityEnabled = false;
        let creditLineLimit = 0;
        let creditLineUsed = 0;
        let creditLineRemaining = 0;
        let creditLineOnLine = 0;
        let creditOnTableThisSession = 0;
        let cashOnTableThisSession = 0;
        if (entry.playerId) {
          const player = await this.playerRepo.findOne({
            where: { id: entry.playerId, club: { id: clubId } },
          });
          if (player) {
            creditFacilityEnabled = !!(player as any).creditEnabled;
            creditLineLimit = Number((player as any).creditLimit) || 0;
            if (creditFacilityEnabled) {
              let approvedSum = 0;
              let creditLedgerNet = 0;
              try {
                approvedSum = await sumApprovedCreditLimitSince(
                  (sql, p) => this.waitlistRepo.manager.query(sql, p),
                  clubId,
                  entry.playerId,
                  (player as any).creditEnabledAt,
                );
                const crLedger = await this.waitlistRepo.manager.query(
                  `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions
                   WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
                  [clubId, entry.playerId],
                );
                creditLedgerNet = Number(crLedger?.[0]?.total ?? 0);
              } catch {
                approvedSum = 0;
                creditLedgerNet = 0;
              }
              // Use same breakdown as player app so values match exactly.
              const breakdown = computeCreditFacilityBreakdown({
                creditLimit: creditLineLimit,
                creditUsedFromApprovals: Math.min(Math.max(0, approvedSum), creditLineLimit),
                creditLedgerNet,
                availableBalance: walletBalance,
                creditEnabled: true,
              });
              creditLineOnLine = breakdown.effectiveCreditOnLine;   // on line (drawn)
              creditLineUsed = breakdown.creditRepaidViaWallet;      // used via negative wallet
              creditLineRemaining = breakdown.availableCredit;       // free headroom
            }
          }
          const crRows = await this.waitlistRepo.manager.query(
            `SELECT COALESCE(SUM(amount), 0)::numeric AS total
             FROM financial_transactions
             WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'
               AND UPPER(TRIM(type)) = 'CREDIT'
               AND created_at >= $3`,
            [clubId, entry.playerId, fromTime],
          );
          creditOnTableThisSession =
            crRows?.[0]?.total != null ? Math.max(0, parseFloat(String(crRows[0].total))) : 0;
          cashOnTableThisSession = Math.max(0, buyInAmount - creditOnTableThisSession);
        }

        return {
          playerId: entry.playerId,
          playerName: entry.playerName || 'Unknown',
          seatNumber: entry.assignedSeat ?? entry.requestedSeat ?? null,
          seatedAt: entry.seatedAt,
          tableNumber: entry.tableNumber,
          buyInAmount: buyInAmount,
          sessionBuyInAmount: buyInAmount,
          walletBalance: walletBalance,
          totalCredits: totalCredits,
          creditFacilityEnabled,
          creditLineLimit,
          creditLineOnLine,   // on line = drawn (matches player "Credit on line")
          creditLineUsed,     // used = negative wallet consuming line (matches player "Credit used")
          creditLineRemaining, // free headroom (matches player "Credit remaining")
          creditOnTableThisSession,
          cashOnTableThisSession,
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

