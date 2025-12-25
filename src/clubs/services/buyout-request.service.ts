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
      requestedAmount: req.requestedAmount ? Number(req.requestedAmount) : null,
      currentTableBalance: req.currentTableBalance ? Number(req.currentTableBalance) : null,
      callTimeStartedAt: req.callTimeStartedAt,
      requestedAt: req.requestedAt,
      status: req.status,
    }));
  }

  async approveBuyOutRequest(
    clubId: string,
    requestId: string,
    dto: ApproveBuyOutDto,
    userId: string
  ) {
    const request = await this.buyOutRequestRepo.findOne({
      where: { id: requestId, club: { id: clubId } },
      relations: ['player', 'table', 'club'],
    });

    if (!request) {
      throw new NotFoundException('Buy-out request not found');
    }

    if (request.status !== BuyOutRequestStatus.PENDING) {
      throw new BadRequestException('This request has already been processed');
    }

    const amount = dto.amount || request.currentTableBalance || request.requestedAmount || 0;

    if (amount <= 0) {
      throw new BadRequestException('Invalid buy-out amount');
    }

    // Use transaction to ensure data consistency
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update request status
      request.status = BuyOutRequestStatus.APPROVED;
      request.processedBy = { id: userId } as any;
      request.processedAt = new Date();
      await queryRunner.manager.save(request);

      // Create cash-out transaction
      const transaction = queryRunner.manager.create(FinancialTransaction, {
        club: { id: clubId } as any,
        player: { id: request.player.id } as any,
        amount: amount,
        type: TransactionType.CASHOUT,
        status: TransactionStatus.COMPLETED,
        description: `Table buy-out - Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''}`,
        processedBy: userId,
      });

      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Buy-out request approved and balance updated',
        requestId: request.id,
        amount: amount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
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
}

