import { Injectable, NotFoundException, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BuyInRequest, BuyInRequestStatus } from '../entities/buyin-request.entity';
import { Player } from '../entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
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
          const fromTime = new Date(new Date(baseTime).getTime() - 30000);

          const balanceResult = await this.dataSource.query(
            `SELECT COALESCE(SUM(
               CASE
                 WHEN UPPER(TRIM(type)) IN ('BUY IN', 'TABLE BUY IN', 'CREDIT') THEN amount
                 WHEN UPPER(TRIM(type)) IN ('TABLE BUY OUT') THEN -amount
                 ELSE 0
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
    const request = await this.buyInRequestRepo.findOne({
      where: { id: requestId, club: { id: clubId } },
      relations: ['player', 'table', 'club'],
    });

    if (!request) {
      throw new NotFoundException('Buy-in request not found');
    }

    if (request.status !== BuyInRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    const amount = dto.amount || request.requestedAmount;

    if (amount <= 0) {
      throw new BadRequestException('Invalid buy-in amount');
    }

    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update request status
      request.status = BuyInRequestStatus.APPROVED;
      request.processedBy = { id: userId } as any;
      request.processedAt = new Date();
      await queryRunner.manager.save(request);

      // Club Buy-In: Player pays cash to club, money goes directly to table.
      // Step 1: Club Buy In → wallet +amount (cash entering the system)
      // Step 2: Table Buy In → wallet -amount (money moves to table)
      // Net: wallet unchanged, table balance increases.

      const tableTypeResult = request.table?.tableType || null;
      const gameType = tableTypeResult === 'RUMMY' ? 'rummy' : 'poker';

      await queryRunner.query(
        `INSERT INTO financial_transactions
         (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Club Buy In', 'Completed', $5, $6, NOW(), NOW())`,
        [
          clubId,
          request.player.id,
          request.player.name,
          amount,
          gameType,
          `Club buy-in - Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''} (approved by staff)`,
        ],
      );

      await queryRunner.query(
        `INSERT INTO financial_transactions
         (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Table Buy In', 'Completed', $5, $6, NOW(), NOW())`,
        [
          clubId,
          request.player.id,
          request.player.name,
          amount,
          gameType,
          `Table buy-in from club buy-in - Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''} (approved by staff)`,
        ],
      );

      console.log(`💰 [BUYIN APPROVED] Player ${request.player.name}: ₹${amount} club buy-in to table (Table ${request.tableNumber})`);

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitBuyRequestStatusChange(request.player.id, clubId, 'buyin', {
          id: request.id,
          status: request.status,
          processedAt: request.processedAt,
          approvedAmount: amount,
        });
        this.eventsService.emitBuyInRequestChanged(clubId);
        this.eventsService.emitTransactionCreated(clubId, request.player.id);
        this.eventsService.emitBalanceUpdated(clubId, request.player.id);
      }

      return {
        success: true,
        message: 'Buy-in approved - table balance updated',
        requestId: request.id,
        amount: amount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
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
    const request = await this.buyInRequestRepo.findOne({
      where: { id: requestId, club: { id: clubId } },
      relations: ['player', 'club'],
    });

    if (!request) {
      throw new NotFoundException('Buy-in request not found');
    }

    if (request.status !== BuyInRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    request.status = BuyInRequestStatus.REJECTED;
    request.processedBy = { id: userId } as any;
    request.processedAt = new Date();
    request.rejectionReason = dto.reason;

    await this.buyInRequestRepo.save(request);

    if (this.eventsService) {
      this.eventsService.emitBuyRequestStatusChange(request.player.id, clubId, 'buyin', {
        id: request.id,
        status: request.status,
        processedAt: request.processedAt,
        rejectionReason: request.rejectionReason,
      });
      this.eventsService.emitBuyInRequestChanged(clubId);
    }

    return {
      success: true,
      message: 'Buy-in request rejected',
      requestId: request.id,
    };
  }
}









