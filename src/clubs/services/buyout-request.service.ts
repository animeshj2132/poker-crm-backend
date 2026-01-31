import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BuyOutRequest, BuyOutRequestStatus } from '../entities/buyout-request.entity';
import { Player } from '../entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import { ApproveBuyOutDto } from '../dto/approve-buyout.dto';
import { RejectBuyOutDto } from '../dto/reject-buyout.dto';

@Injectable()
export class BuyOutRequestService {
  constructor(
    @InjectRepository(BuyOutRequest)
    private buyOutRequestRepo: Repository<BuyOutRequest>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction)
    private transactionRepo: Repository<FinancialTransaction>,
    private dataSource: DataSource,
  ) {}

  async getPendingBuyOutRequests(clubId: string) {
    const requests = await this.buyOutRequestRepo.find({
      where: {
        club: { id: clubId },
        status: BuyOutRequestStatus.PENDING,
      },
      relations: ['player', 'table', 'club'],
      order: { requestedAt: 'ASC' },
    });

    return requests.map(req => ({
      id: req.id,
      playerId: req.player.id,
      playerName: req.player.name,
      playerEmail: req.player.email,
      tableId: req.table?.id || null,
      tableNumber: req.tableNumber,
      seatNumber: req.seatNumber,
      requestedAmount: req.requestedAmount ? Number(req.requestedAmount) : 0,
      currentTableBalance: req.currentTableBalance ? Number(req.currentTableBalance) : null,
      requestedAt: req.requestedAt,
      status: req.status,
      callTimeStartedAt: req.callTimeStartedAt,
    }));
  }

  async approveBuyOutRequest(
    clubId: string,
    requestId: string,
    dto: ApproveBuyOutDto,
    userId: string
  ) {
    // Get request using raw query first to ensure we have player_id
    const rawRequest = await this.dataSource.query(
      `SELECT * FROM buyout_requests WHERE id = $1 AND club_id = $2`,
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

    const amount = dto.amount || requestData.requested_amount || requestData.current_table_balance || 0;

    if (amount <= 0) {
      throw new BadRequestException('Invalid buy-out amount');
    }

    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update request status using raw query
      await queryRunner.query(
        `UPDATE buyout_requests 
         SET status = 'approved', processed_by = $1, processed_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        [userId, requestId]
      );

      // Get player name for transaction
      const playerData = await queryRunner.query(
        `SELECT name FROM players WHERE id = $1`,
        [playerId]
      );
      const playerName = playerData && playerData.length > 0 ? playerData[0].name : 'Unknown Player';

      // Create buy-out transaction (DEPOSIT) - adds money to player's balance
      await queryRunner.query(
        `INSERT INTO financial_transactions 
         (club_id, player_id, player_name, amount, type, status, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Deposit', 'Completed', $5, NOW(), NOW())`,
        [
          clubId,
          playerId,
          playerName,
          amount,
          `Table buy-out - Table ${requestData.table_number}${requestData.seat_number ? `, Seat ${requestData.seat_number}` : ''}`
        ]
      );

      // Unseat the player from the waitlist and get table info
      await queryRunner.query(
        `UPDATE waitlist_entries 
         SET status = 'completed', updated_at = NOW()
         WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
        [playerId, clubId]
      );

      // Decrement table's current seats count
      if (requestData.table_number) {
        await queryRunner.query(
          `UPDATE tables 
           SET current_seats = GREATEST(0, current_seats - 1), updated_at = NOW()
           WHERE club_id = $1 AND table_number = $2`,
          [clubId, requestData.table_number]
        );
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Buy-out request approved and balance updated',
        requestId: requestId,
        amount: amount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
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
    const request = await this.buyOutRequestRepo.findOne({
      where: { id: requestId, club: { id: clubId } },
      relations: ['player', 'club'],
    });

    if (!request) {
      throw new NotFoundException('Buy-out request not found');
    }

    if (request.status !== BuyOutRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    request.status = BuyOutRequestStatus.REJECTED;
    request.processedBy = { id: userId } as any;
    request.processedAt = new Date();
    request.rejectionReason = dto.reason;

    await this.buyOutRequestRepo.save(request);

    return {
      success: true,
      message: 'Buy-out request rejected',
      requestId: request.id,
    };
  }

  async settleAllPlayersOnTable(
    clubId: string,
    tableId: string,
    settlements: Array<{ playerId: string; amount: number }>,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results = [];

      for (const { playerId, amount } of settlements) {
        // Get player name
        const playerData = await queryRunner.query(
          `SELECT name FROM players WHERE id = $1`,
          [playerId]
        );
        const playerName = playerData && playerData.length > 0 ? playerData[0].name : 'Unknown Player';

        // Get table info
        const tableData = await queryRunner.query(
          `SELECT table_number FROM tables WHERE id = $1`,
          [tableId]
        );
        const tableNumber = tableData && tableData.length > 0 ? tableData[0].table_number : null;

        // Get waitlist entry info
        const waitlistData = await queryRunner.query(
          `SELECT requested_seat FROM waitlist_entries WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
          [playerId, clubId]
        );
        const seatNumber = waitlistData && waitlistData.length > 0 ? waitlistData[0].requested_seat : null;

        // Create settlement transaction (DEPOSIT) - adds money to player's balance
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Deposit', 'Completed', $5, NOW(), NOW())`,
          [
            clubId,
            playerId,
            playerName,
            amount,
            `Session settlement - Table ${tableNumber}${seatNumber ? `, Seat ${seatNumber}` : ''}`
          ]
        );

        // Unseat the player from the waitlist
        await queryRunner.query(
          `UPDATE waitlist_entries 
           SET status = 'completed', updated_at = NOW()
           WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
          [playerId, clubId]
        );

        results.push({ playerId, playerName, amount, settled: true });
      }

      // Reset table's current seats to 0
      await queryRunner.query(
        `UPDATE tables 
         SET current_seats = 0, updated_at = NOW()
         WHERE club_id = $1 AND id = $2`,
        [clubId, tableId]
      );

      await queryRunner.commitTransaction();
      return { success: true, settlements: results };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
