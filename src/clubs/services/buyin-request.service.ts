import { Injectable, NotFoundException, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BuyInRequest, BuyInRequestStatus } from '../entities/buyin-request.entity';
import { Player } from '../entities/player.entity';
import {
  FinancialTransaction,
  TransactionType,
  TransactionStatus,
  SESSION_TABLE_CHIPS_SUM_CASE_INNER,
} from '../entities/financial-transaction.entity';
import { ApproveBuyInDto } from '../dto/approve-buyin.dto';
import { RejectBuyInDto } from '../dto/reject-buyin.dto';
import { EventsService } from '../../events/events.service';

@Injectable()
export class BuyInRequestService {
  constructor(
    @InjectRepository(BuyInRequest)
    private buyInRequestRepo: Repository<BuyInRequest>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction)
    private transactionRepo: Repository<FinancialTransaction>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService?: EventsService,
  ) {}

  async getPendingBuyInRequests(clubId: string) {
    const requests = await this.buyInRequestRepo.find({
      where: {
        club: { id: clubId },
        status: BuyInRequestStatus.PENDING,
      },
      relations: ['player', 'table', 'club'],
      order: { requestedAt: 'ASC' },
    });

    const rows = await Promise.all(
      requests.map(async (req) => {
        // Compute live table balance so pending cards always show latest value, not stale snapshot.
        let liveTableBalance: number | null = null;
        try {
          const seatedEntry = await this.dataSource.query(
            `SELECT seated_at
             FROM waitlist_entries
             WHERE club_id = $1
               AND player_id = $2
               AND status = 'SEATED'
               AND table_number = $3
             ORDER BY seated_at DESC NULLS LAST
             LIMIT 1`,
            [clubId, req.player.id, req.tableNumber]
          );

          const baseTime =
            seatedEntry?.[0]?.seated_at ||
            req.requestedAt ||
            new Date(0);
          const fromTime = new Date(baseTime);

          const balanceResult = await this.dataSource.query(
            `SELECT COALESCE(SUM(
               CASE
                 ${SESSION_TABLE_CHIPS_SUM_CASE_INNER}
               END
             ), 0) AS table_balance
             FROM financial_transactions
             WHERE club_id = $1
               AND player_id = $2
               AND UPPER(status) = 'COMPLETED'
               AND created_at >= $3`,
            [clubId, req.player.id, fromTime]
          );

          liveTableBalance = Math.max(
            0,
            Number(balanceResult?.[0]?.table_balance || 0),
          );
        } catch {
          // Keep fallback below if live calc fails.
          liveTableBalance = null;
        }

        return {
          id: req.id,
          playerId: req.player.id,
          playerName: req.player.name,
          playerEmail: req.player.email,
          tableId: req.table?.id || null,
          tableNumber: req.tableNumber,
          seatNumber: req.seatNumber,
          requestedAmount: req.requestedAmount ? Number(req.requestedAmount) : 0,
          currentTableBalance:
            liveTableBalance != null
              ? liveTableBalance
              : (req.currentTableBalance ? Number(req.currentTableBalance) : 0),
          requestedAt: req.requestedAt,
          status: req.status,
        };
      })
    );

    return rows;
  }

  async approveBuyInRequest(
    clubId: string,
    requestId: string,
    dto: ApproveBuyInDto,
    userId: string
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Raw SELECT FOR UPDATE on just the buyin_requests row — avoids join-related FOR UPDATE restrictions.
      // Two concurrent approvals serialize here; second sees status=APPROVED after lock is released.
      const locked = await queryRunner.query(
        `SELECT br.id, br.status, br.requested_amount, br.table_number, br.seat_number,
                br.player_id, br.table_id,
                p.name as player_name, p.email as player_email,
                t.table_type
         FROM buyin_requests br
         JOIN players p ON p.id = br.player_id
         LEFT JOIN tables t ON t.id = br.table_id
         WHERE br.id = $1 AND br.club_id = $2
         FOR UPDATE OF br`,
        [requestId, clubId]
      );

      if (!locked || locked.length === 0) {
        throw new NotFoundException('Buy-in request not found');
      }

      const row = locked[0];

      if (row.status !== 'pending') {
        throw new BadRequestException('This request has already been processed');
      }

      const amount = dto.amount || Number(row.requested_amount);

      if (amount <= 0) {
        throw new BadRequestException('Invalid buy-in amount');
      }

      // Update request status
      await queryRunner.query(
        `UPDATE buyin_requests SET status = 'approved', processed_by = $1, processed_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [userId, requestId]
      );

      const gameType = row.table_type === 'RUMMY' ? 'rummy' : 'poker';
      const playerId = row.player_id;
      const playerName = row.player_name;
      const tableNumber = row.table_number;
      const seatNumber = row.seat_number;

      await queryRunner.query(
        `INSERT INTO financial_transactions
         (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Club Buy In', 'Completed', $5, $6, NOW(), NOW())`,
        [
          clubId,
          playerId,
          playerName,
          amount,
          gameType,
          `Club buy-in - Table ${tableNumber}${seatNumber ? `, Seat ${seatNumber}` : ''} (approved by staff)`,
        ],
      );

      await queryRunner.query(
        `INSERT INTO financial_transactions
         (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Table Buy In', 'Completed', $5, $6, NOW(), NOW())`,
        [
          clubId,
          playerId,
          playerName,
          amount,
          gameType,
          `Table buy-in from club buy-in - Table ${tableNumber}${seatNumber ? `, Seat ${seatNumber}` : ''} (approved by staff)`,
        ],
      );

      console.log(`💰 [BUYIN APPROVED] Player ${playerName}: ₹${amount} club buy-in to table (Table ${tableNumber})`);

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitBuyRequestStatusChange(playerId, clubId, 'buyin', {
          id: requestId,
          status: BuyInRequestStatus.APPROVED,
          processedAt: new Date(),
          approvedAmount: amount,
        });
        this.eventsService.emitBuyInRequestChanged(clubId);
        this.eventsService.emitTransactionCreated(clubId, playerId);
        this.eventsService.emitBalanceUpdated(clubId, playerId);
      }

      return {
        success: true,
        message: 'Buy-in approved - table balance updated',
        requestId: requestId,
        amount: amount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to approve buy-in request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await queryRunner.release();
    }
  }

  async rejectBuyInRequest(
    clubId: string,
    requestId: string,
    dto: RejectBuyInDto,
    userId: string
  ) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const locked = await qr.query(
        `SELECT id, player_id FROM buyin_requests WHERE id = $1 AND club_id = $2 FOR UPDATE`,
        [requestId, clubId]
      );
      if (!locked || locked.length === 0) throw new NotFoundException('Buy-in request not found');

      const currentStatus = await qr.query(
        `SELECT status FROM buyin_requests WHERE id = $1`,
        [requestId]
      );
      if (currentStatus[0]?.status !== 'pending') {
        throw new BadRequestException('This request has already been processed');
      }

      await qr.query(
        `UPDATE buyin_requests SET status='rejected', processed_by=$1, processed_at=NOW(), rejection_reason=$2, updated_at=NOW() WHERE id=$3`,
        [userId, dto.reason || null, requestId]
      );

      const playerId = locked[0].player_id;
      await qr.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitBuyRequestStatusChange(playerId, clubId, 'buyin', {
          id: requestId, status: BuyInRequestStatus.REJECTED, processedAt: new Date(), rejectionReason: dto.reason,
        });
        this.eventsService.emitBuyInRequestChanged(clubId);
      }
      return { success: true, message: 'Buy-in request rejected', requestId };
    } catch (error) {
      await qr.rollbackTransaction();
      if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Failed to reject buy-in request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await qr.release();
    }
  }
}









