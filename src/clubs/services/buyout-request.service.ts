import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BuyOutRequest, BuyOutRequestStatus } from '../entities/buyout-request.entity';
import { Player } from '../entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus, WALLET_BALANCE_SQL, CREDIT_BALANCE_SQL } from '../entities/financial-transaction.entity';
import { RakeCollection } from '../entities/rake-collection.entity';
import { Table } from '../entities/table.entity';
import { ApproveBuyOutDto } from '../dto/approve-buyout.dto';
import { RejectBuyOutDto } from '../dto/reject-buyout.dto';
import { EventsService } from '../../events/events.service';

@Injectable()
export class BuyOutRequestService {
  /**
   * buyout_requests timestamps are stored as timestamp-without-timezone in DB.
   * Treat them as UTC to avoid IST/UI drift.
   */
  private toUtcIso(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const src = value instanceof Date ? value : new Date(value);
    if (!(src instanceof Date) || Number.isNaN(src.getTime())) return null;

    const utcDate = new Date(Date.UTC(
      src.getFullYear(),
      src.getMonth(),
      src.getDate(),
      src.getHours(),
      src.getMinutes(),
      src.getSeconds(),
      src.getMilliseconds(),
    ));
    return utcDate.toISOString();
  }

  constructor(
    @InjectRepository(BuyOutRequest)
    private buyOutRequestRepo: Repository<BuyOutRequest>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction)
    private transactionRepo: Repository<FinancialTransaction>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService?: EventsService,
  ) {}

  /** Notify player + staff that the waitlist row ended (buy-out / settlement), not re-queued. */
  private async emitPostBuyoutWaitlist(clubId: string, playerId: string) {
    if (!this.eventsService) return;
    const rows = await this.dataSource.query(
      `SELECT id, player_id, status, table_number, table_type, created_at
       FROM waitlist_entries
       WHERE player_id = $1 AND club_id = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [playerId, clubId],
    );
    const r = rows?.[0];
    if (!r) return;
    this.eventsService.emitWaitlistStatusChange(playerId, clubId, {
      id: r.id,
      status: r.status,
      tableNumber: r.table_number,
      tableType: r.table_type,
      createdAt: r.created_at,
      playerId: r.player_id,
    });
    this.eventsService.emitBalanceUpdated(clubId, playerId);
    this.eventsService.emitPlayerUpdated(clubId, playerId);
  }

  async getPendingBuyOutRequests(clubId: string, gameType?: string) {
    const requests = await this.buyOutRequestRepo.find({
      where: {
        club: { id: clubId },
        status: BuyOutRequestStatus.PENDING,
      },
      relations: ['player', 'table', 'club'],
      order: { requestedAt: 'ASC' },
    });

    const normalizedGameType =
      String(gameType || '').trim().toLowerCase() === 'rummy' ? 'rummy' :
      String(gameType || '').trim().toLowerCase() === 'poker' ? 'poker' :
      null;

    const rows = requests.map(req => {
      const rowGameType = String(req.table?.tableType || '').toUpperCase() === 'RUMMY' ? 'rummy' : 'poker';
      return {
      id: req.id,
      playerId: req.player.id,
      playerName: req.player.name,
      playerEmail: req.player.email,
      tableId: req.table?.id || null,
      tableNumber: req.tableNumber,
      seatNumber: req.seatNumber,
      requestedAmount: req.requestedAmount ? Number(req.requestedAmount) : 0,
      currentTableBalance: req.currentTableBalance ? Number(req.currentTableBalance) : null,
      requestedAt: this.toUtcIso(req.requestedAt),
      status: req.status,
      callTimeStartedAt: this.toUtcIso(req.callTimeStartedAt),
      gameType: rowGameType,
      tableType: req.table?.tableType || null,
      };
    });

    if (!normalizedGameType) return rows;
    return rows.filter((row) => row.gameType === normalizedGameType);
  }

  async approveBuyOutRequest(
    clubId: string,
    requestId: string,
    dto: ApproveBuyOutDto,
    userId: string
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Lock the row inside the transaction — prevents double-approval race condition.
      const rawRequest = await queryRunner.query(
        `SELECT * FROM buyout_requests WHERE id = $1 AND club_id = $2 FOR UPDATE`,
        [requestId, clubId]
      );

      if (!rawRequest || rawRequest.length === 0) {
        throw new NotFoundException('Buy-out request not found');
      }

      const requestData = rawRequest[0];

      if (requestData.status !== 'pending') {
        throw new BadRequestException('This request has already been processed');
      }

      const playerId = requestData.player_id;
      if (!playerId) {
        throw new BadRequestException('Buy-out request is missing player information');
      }

      const amount = dto.amount !== undefined && dto.amount !== null
        ? Number(dto.amount)
        : (requestData.requested_amount ?? requestData.current_table_balance ?? 0);
      const finalAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;

      if (finalAmount < 0) {
        throw new BadRequestException('Buy-out amount cannot be negative');
      }

      // Update request status
      await queryRunner.query(
        `UPDATE buyout_requests
         SET status = 'approved', processed_by = $1, processed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [userId, requestId]
      );

      const playerData = await queryRunner.query(
        `SELECT name FROM players WHERE id = $1`,
        [playerId]
      );
      const playerName = playerData && playerData.length > 0 ? playerData[0].name : 'Unknown Player';

      let gameType = 'poker';
      if (requestData.table_number) {
        const tableData = await queryRunner.query(
          `SELECT table_type FROM tables WHERE table_number = $1 AND club_id = $2 LIMIT 1`,
          [requestData.table_number, clubId]
        );
        if (tableData?.[0]?.table_type === 'RUMMY') gameType = 'rummy';
      }

      // Calculate outstanding credit balance (Credit given - Debit paybacks)
      const creditResult = await queryRunner.query(
        `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions 
         WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
        [clubId, playerId]
      );
      const creditOwed = Math.max(0, creditResult[0]?.total ? Number(creditResult[0].total) : 0);

      console.log(`💰 [BUYOUT] Player ${playerName}:`);
      console.log(`   Exit amount (chips left): ₹${finalAmount}`);
      console.log(`   Outstanding credit owed: ₹${creditOwed}`);

      // Step 1: Table Buy Out - return chips from table to wallet (can be 0 if player lost everything)
      await queryRunner.query(
        `INSERT INTO financial_transactions 
         (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Table Buy Out', 'Completed', $5, $6, NOW(), NOW())`,
        [
          clubId, playerId, playerName, finalAmount, gameType,
          `Table buy-out - Table ${requestData.table_number} - ₹${finalAmount} returned from table to wallet`
        ]
      );

      // Step 2: Settle credit - Debit the FULL credit amount owed
      // This may push wallet negative, which is correct behavior
      if (creditOwed > 0) {
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $5, $6, NOW(), NOW())`,
          [
            clubId, playerId, playerName, creditOwed, gameType,
            `Credit settlement on table exit - ₹${creditOwed} credit repaid (Table ${requestData.table_number})`
          ]
        );

        const netWalletChange = finalAmount - creditOwed;
        if (netWalletChange >= 0) {
          console.log(`   ✅ Credit fully settled. Net wallet change: +₹${netWalletChange}`);
        } else {
          console.log(`   ⚠️ Credit settled but wallet goes negative by ₹${Math.abs(netWalletChange)}`);
        }
      } else {
        console.log(`   No credit to settle, full amount goes to wallet`);
      }

      await queryRunner.query(
        `UPDATE waitlist_entries
         SET status = 'CANCELLED', cancelled_at = NOW(), table_number = NULL, seated_at = NULL, seated_by = NULL,
             assigned_seat = NULL, updated_at = NOW()
         WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
        [playerId, clubId],
      );

      if (requestData.table_number) {
        await queryRunner.query(
          `UPDATE tables 
           SET current_seats = GREATEST(0, current_seats - 1), updated_at = NOW()
           WHERE club_id = $1 AND table_number = $2`,
          [clubId, requestData.table_number]
        );
      }

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitBuyRequestStatusChange(playerId, clubId, 'buyout', {
          id: requestId,
          status: 'approved',
          processedAt: new Date(),
          approvedAmount: finalAmount,
        });
        this.eventsService.emitBuyOutRequestChanged(clubId);
        this.eventsService.emitTransactionCreated(clubId, playerId);
      }

      await this.emitPostBuyoutWaitlist(clubId, playerId);

      return {
        success: true,
        message: 'Buy-out approved and balance settled',
        requestId: requestId,
        amount: finalAmount,
        creditSettled: creditOwed,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error approving buy-out request:', error);
      throw new BadRequestException(`Failed to approve buy-out request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await queryRunner.release();
    }
  }

  async rejectBuyOutRequest(
    clubId: string,
    requestId: string,
    dto: RejectBuyOutDto,
    userId: string
  ) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const locked = await qr.query(
        `SELECT id, player_id FROM buyout_requests WHERE id = $1 AND club_id = $2 FOR UPDATE`,
        [requestId, clubId]
      );
      if (!locked || locked.length === 0) throw new NotFoundException('Buy-out request not found');

      const currentStatus = await qr.query(
        `SELECT status FROM buyout_requests WHERE id = $1`,
        [requestId]
      );
      if (currentStatus[0]?.status !== 'pending') {
        throw new BadRequestException('This request has already been processed');
      }

      await qr.query(
        `UPDATE buyout_requests SET status='rejected', processed_by=$1, processed_at=NOW(), rejection_reason=$2, updated_at=NOW() WHERE id=$3`,
        [userId, dto.reason || null, requestId]
      );

      const playerId = locked[0].player_id;
      await qr.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitBuyRequestStatusChange(playerId, clubId, 'buyout', {
          id: requestId, status: BuyOutRequestStatus.REJECTED, processedAt: new Date(), rejectionReason: dto.reason,
        });
        this.eventsService.emitBuyOutRequestChanged(clubId);
      }
      return { success: true, message: 'Buy-out request rejected', requestId };
    } catch (error) {
      await qr.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to reject buy-out request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await qr.release();
    }
  }

  async settleAllPlayersOnTable(
    clubId: string,
    tableId: string,
    settlements: Array<{ playerId: string; amount: number }>,
    rakeAmount?: number,
    collectedByUserId?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = [];

      // Get table info once (including type for game_type tagging)
      const tableData = await queryRunner.query(
        `SELECT id, table_number, table_type FROM tables WHERE id = $1 AND club_id = $2`,
        [tableId, clubId]
      );
      const tableNumber = tableData && tableData.length > 0 ? tableData[0].table_number : null;
      const settlementGameType = tableData?.[0]?.table_type === 'RUMMY' ? 'rummy' : 'poker';

      for (const { playerId, amount } of settlements) {
        const playerData = await queryRunner.query(
          `SELECT name FROM players WHERE id = $1`,
          [playerId]
        );
        const playerName = playerData && playerData.length > 0 ? playerData[0].name : 'Unknown Player';

        const waitlistData = await queryRunner.query(
          `SELECT requested_seat FROM waitlist_entries WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
          [playerId, clubId]
        );
        const seatNumber = waitlistData && waitlistData.length > 0 ? waitlistData[0].requested_seat : null;

        // Step 1: Table Buy Out - return chips from table to wallet
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Table Buy Out', 'Completed', $5, $6, NOW(), NOW())`,
          [
            clubId, playerId, playerName, amount, settlementGameType,
            `Table settlement - Table ${tableNumber}${seatNumber ? `, Seat ${seatNumber}` : ''} - ₹${amount} returned to wallet`
          ]
        );

        // Step 2: Settle any outstanding credit
        const creditResult = await queryRunner.query(
          `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions 
           WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
          [clubId, playerId]
        );
        const creditOwed = Math.max(0, creditResult[0]?.total ? Number(creditResult[0].total) : 0);

        if (creditOwed > 0) {
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $5, $6, NOW(), NOW())`,
            [
              clubId, playerId, playerName, creditOwed, settlementGameType,
              `Credit settlement on table close - ₹${creditOwed} credit repaid (Table ${tableNumber})`
            ]
          );
          console.log(`💰 [SETTLEMENT] Player ${playerName}: ₹${amount} table buy-out, ₹${creditOwed} credit settled`);
        } else {
          console.log(`💰 [SETTLEMENT] Player ${playerName}: ₹${amount} table buy-out, no credit to settle`);
        }

        await queryRunner.query(
          `UPDATE waitlist_entries
           SET status = 'CANCELLED', cancelled_at = NOW(), table_number = NULL, seated_at = NULL, seated_by = NULL,
               assigned_seat = NULL, updated_at = NOW()
           WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
          [playerId, clubId],
        );

        results.push({ playerId, playerName, amount, creditSettled: creditOwed, settled: true });
      }

      // Record rake collection if provided
      let rakeRecord = null;
      if (rakeAmount && rakeAmount > 0 && tableNumber) {
        // Get the user who collected (for audit trail)
        let collectedByName = 'System';
        if (collectedByUserId) {
          const userData = await queryRunner.query(
            `SELECT display_name, email FROM users_v1 WHERE id = $1`,
            [collectedByUserId]
          );
          if (userData && userData.length > 0) {
            collectedByName = userData[0].display_name || userData[0].email || 'System';
          }
        }

        await queryRunner.query(
          `INSERT INTO rake_collections
           (club_id, table_id, table_number, session_date, total_rake_amount, collected_by, collected_by_name, collected_at, notes, created_at, updated_at)
           VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, NOW(), $7, NOW(), NOW())`,
          [
            clubId,
            tableId,
            tableNumber,
            rakeAmount,
            collectedByUserId || null,
            collectedByName,
            `Auto-recorded rake on session end - Table ${tableNumber} - ${settlements.length} players settled`,
          ]
        );

        console.log(`🎰 [RAKE] Recorded rake of ₹${rakeAmount} for Table ${tableNumber}`);
        rakeRecord = { tableNumber, rakeAmount, collectedByName };
      }

      // Reset table's current seats to 0
      await queryRunner.query(
        `UPDATE tables 
         SET current_seats = 0, updated_at = NOW()
         WHERE club_id = $1 AND id = $2`,
        [clubId, tableId]
      );

      await queryRunner.commitTransaction();

      for (const { playerId } of settlements) {
        await this.emitPostBuyoutWaitlist(clubId, playerId);
      }

      return { success: true, settlements: results, rake: rakeRecord };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Staff "Process Buy-Out" (no buyout_requests row).
   * Same ledger as player call-time approval: Table Buy Out moves chips to wallet, then Debit
   * settles outstanding credit (Credit − Debit in ledger). Net wallet can go negative when
   * the player lost more than their remaining chips — that is the "loss hits cash then credit" effect.
   */
  async settleStaffManualTableBuyOut(
    clubId: string,
    dto: { playerId: string; tableNumber: number; amount: number; reason?: string | null },
  ) {
    const playerId = String(dto.playerId || '').trim();
    const tableNumber = Number(dto.tableNumber);
    const finalAmount = Math.max(0, Number(dto.amount) || 0);
    if (!playerId) {
      throw new BadRequestException('playerId is required');
    }
    if (!Number.isFinite(tableNumber) || tableNumber < 1) {
      throw new BadRequestException('Invalid table number');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wl = await queryRunner.query(
        `SELECT id FROM waitlist_entries 
         WHERE club_id = $1 AND player_id = $2 AND status = 'SEATED' AND table_number = $3
         LIMIT 1`,
        [clubId, playerId, tableNumber],
      );
      if (!wl?.length) {
        throw new BadRequestException(`Player is not seated at Table ${tableNumber}`);
      }

      const playerData = await queryRunner.query(
        `SELECT name FROM players WHERE id = $1 AND club_id = $2 LIMIT 1`,
        [playerId, clubId],
      );
      const playerName = playerData?.[0]?.name || 'Unknown Player';

      const tableData = await queryRunner.query(
        `SELECT id, table_type FROM tables WHERE table_number = $1 AND club_id = $2 LIMIT 1`,
        [tableNumber, clubId],
      );
      const gameType = String(tableData?.[0]?.table_type || '').toUpperCase() === 'RUMMY' ? 'rummy' : 'poker';
      const tableId = tableData?.[0]?.id || null;

      const noteSuffix = dto.reason?.trim()
        ? ` — ${dto.reason.trim().replace(/\|/g, ' ').substring(0, 200)}`
        : '';

      await queryRunner.query(
        `INSERT INTO financial_transactions 
         (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Table Buy Out', 'Completed', $5, $6, NOW(), NOW())`,
        [
          clubId,
          playerId,
          playerName,
          finalAmount,
          gameType,
          `Buy-out from Table ${tableNumber}${noteSuffix} — ₹${finalAmount} returned from table to wallet`,
        ],
      );

      const creditResult = await queryRunner.query(
        `SELECT ${CREDIT_BALANCE_SQL} as total FROM financial_transactions 
         WHERE club_id = $1 AND player_id = $2 AND UPPER(status) = 'COMPLETED'`,
        [clubId, playerId],
      );
      const creditOwed = Math.max(0, creditResult[0]?.total ? Number(creditResult[0].total) : 0);

      if (creditOwed > 0) {
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $5, $6, NOW(), NOW())`,
          [
            clubId,
            playerId,
            playerName,
            creditOwed,
            gameType,
            `Credit settlement on staff buy-out — ₹${creditOwed} (Table ${tableNumber})`,
          ],
        );
      }

      await queryRunner.query(
        `UPDATE waitlist_entries
         SET status = 'CANCELLED', cancelled_at = NOW(), table_number = NULL, seated_at = NULL, seated_by = NULL,
             assigned_seat = NULL, updated_at = NOW()
         WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED' AND table_number = $3`,
        [playerId, clubId, tableNumber],
      );

      await queryRunner.query(
        `UPDATE tables 
         SET current_seats = GREATEST(0, current_seats - 1), updated_at = NOW()
         WHERE club_id = $1 AND table_number = $2`,
        [clubId, tableNumber],
      );

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitTransactionCreated(clubId, playerId);
        this.eventsService.emitBuyInRequestChanged(clubId);
        if (tableId) {
          const trows = await this.dataSource.query(
            `SELECT * FROM tables WHERE id = $1 AND club_id = $2 LIMIT 1`,
            [tableId, clubId],
          );
          const r = trows?.[0];
          if (r) {
            const maxSeats = Number(r.max_seats) || 0;
            const currentSeats = Number(r.current_seats) || 0;
            this.eventsService.emitTableStatusChange(clubId, {
              id: r.id,
              tableNumber: r.table_number,
              tableType: r.table_type,
              maxSeats,
              currentSeats,
              minBuyIn: r.min_buy_in,
              maxBuyIn: r.max_buy_in,
              status: r.status,
              notes: r.notes,
            });
          }
        }
      }
      await this.emitPostBuyoutWaitlist(clubId, playerId);

      return {
        success: true,
        amount: finalAmount,
        creditSettled: creditOwed,
        message:
          creditOwed > 0
            ? `Buy-out complete. ₹${finalAmount} chips to wallet; ₹${creditOwed} credit settled (wallet may show negative until repaid).`
            : 'Buy-out complete. Chips returned to wallet.',
      };
    } catch (e) {
      await queryRunner.rollbackTransaction();
      if (e instanceof BadRequestException || e instanceof NotFoundException) {
        throw e;
      }
      console.error('[manual-table-buyout]', e);
      throw new BadRequestException(e instanceof Error ? e.message : 'Manual buy-out failed');
    } finally {
      await queryRunner.release();
    }
  }
}
