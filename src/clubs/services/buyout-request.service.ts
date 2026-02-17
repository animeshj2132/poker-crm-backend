import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BuyOutRequest, BuyOutRequestStatus } from '../entities/buyout-request.entity';
import { Player } from '../entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import { RakeCollection } from '../entities/rake-collection.entity';
import { Table } from '../entities/table.entity';
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

      // Determine game type from the table
      let gameType = 'poker';
      if (requestData.table_number) {
        const tableData = await queryRunner.query(
          `SELECT table_type FROM tables WHERE table_number = $1 AND club_id = $2 LIMIT 1`,
          [requestData.table_number, clubId]
        );
        if (tableData?.[0]?.table_type === 'RUMMY') gameType = 'rummy';
      }

      // CRITICAL: Calculate credit used while at table
      // Get all CREDIT transactions while player was seated
      const creditTransactions = await queryRunner.query(
        `SELECT SUM(amount) as total FROM financial_transactions 
         WHERE club_id = $1 AND player_id = $2 AND UPPER(type) = 'CREDIT' AND UPPER(status) = 'COMPLETED'
         AND created_at >= (
           SELECT seated_at FROM waitlist_entries 
           WHERE player_id = $2 AND club_id = $1 AND status = 'SEATED' 
           LIMIT 1
         )`,
        [clubId, playerId]
      );
      const creditUsed = creditTransactions[0]?.total ? Number(creditTransactions[0].total) : 0;
      
      console.log(`💰 [BUYOUT] Player ${playerName}:`);
      console.log(`   Table cashout amount: ₹${amount}`);
      console.log(`   Credit used at table: ₹${creditUsed}`);

      // CRITICAL LOGIC: Credit Payback
      // If credit was used, it must be paid back first from the cashout amount
      if (creditUsed > 0) {
        if (amount >= creditUsed) {
          // Case 1: Player has enough to pay back credit
          const remainingAmount = amount - creditUsed;
          
          console.log(`   ✅ Player has enough to pay back credit`);
          console.log(`   Paying back credit: ₹${creditUsed}`);
          console.log(`   Remaining for wallet: ₹${remainingAmount}`);
          
          // Return table money to wallet (full amount)
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'Deposit', 'Completed', $5, $6, NOW(), NOW())`,
            [
              clubId,
              playerId,
              playerName,
              amount,
              gameType,
              `Table checkout - ₹${amount} (₹${creditUsed} credit payback + ₹${remainingAmount} profit)`
            ]
          );
          
          // Create DEBIT transaction to mark credit as paid back
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $5, $6, NOW(), NOW())`,
            [
              clubId,
              playerId,
              playerName,
              creditUsed,
              gameType,
              `Credit payback from table cashout - ₹${creditUsed} credit paid back`
            ]
          );
          
          console.log(`   Final wallet balance: ₹${remainingAmount} (positive)`);
        } else {
          // Case 2: Player doesn't have enough to pay back credit - owes money
          const shortfall = creditUsed - amount;
          
          console.log(`   ⚠️ Player doesn't have enough to pay back credit`);
          console.log(`   Shortfall: ₹${shortfall}`);
          console.log(`   Player owes club: ₹${shortfall}`);
          
          // Return what they have from table
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'Deposit', 'Completed', $5, $6, NOW(), NOW())`,
            [
              clubId,
              playerId,
              playerName,
              amount,
              gameType,
              `Table checkout - ₹${amount} (partial credit payback, still owes ₹${shortfall})`
            ]
          );
          
          // Create DEBIT for the partial payback
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $5, $6, NOW(), NOW())`,
            [
              clubId,
              playerId,
              playerName,
              amount,
              gameType,
              `Partial credit payback - ₹${amount} of ₹${creditUsed} credit paid back`
            ]
          );
          
          console.log(`   Final wallet balance: -₹${shortfall} (NEGATIVE - cashier must collect)`);
        }
      } else {
        // No credit used, just return cash to wallet
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Deposit', 'Completed', $5, $6, NOW(), NOW())`,
          [
            clubId,
            playerId,
            playerName,
            amount,
            gameType,
            `Table checkout - ₹${amount} (no credit used)`
          ]
        );
        
        console.log(`   No credit used, wallet gets full amount: ₹${amount}`);
      }

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
        // Get player name
        const playerData = await queryRunner.query(
          `SELECT name FROM players WHERE id = $1`,
          [playerId]
        );
        const playerName = playerData && playerData.length > 0 ? playerData[0].name : 'Unknown Player';

        // Get waitlist entry info
        const waitlistData = await queryRunner.query(
          `SELECT requested_seat FROM waitlist_entries WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
          [playerId, clubId]
        );
        const seatNumber = waitlistData && waitlistData.length > 0 ? waitlistData[0].requested_seat : null;

        // CRITICAL: Create settlement transaction (DEPOSIT) - returns table balance to wallet
        // Can result in negative wallet balance if player used more credit than cash
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'Deposit', 'Completed', $5, $6, NOW(), NOW())`,
          [
            clubId,
            playerId,
            playerName,
            amount,
            settlementGameType,
            `Call time settlement - Table ${tableNumber}${seatNumber ? `, Seat ${seatNumber}` : ''} - Returning table balance to wallet`
          ]
        );
        
        console.log(`💰 [SETTLEMENT] Returned ₹${amount} from table to wallet for player ${playerName}`);

        // Unseat the player from the waitlist
        await queryRunner.query(
          `UPDATE waitlist_entries 
           SET status = 'completed', updated_at = NOW()
           WHERE player_id = $1 AND club_id = $2 AND status = 'SEATED'`,
          [playerId, clubId]
        );

        results.push({ playerId, playerName, amount, settled: true });
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
      return { success: true, settlements: results, rake: rakeRecord };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
