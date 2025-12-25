import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BuyInRequest, BuyInRequestStatus } from '../entities/buyin-request.entity';
import { Player } from '../entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import { ApproveBuyInDto } from '../dto/approve-buyin.dto';
import { RejectBuyInDto } from '../dto/reject-buyin.dto';

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
    }));
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

      // Create buy-in transaction
      const transaction = queryRunner.manager.create(FinancialTransaction, {
        club: { id: clubId } as any,
        player: { id: request.player.id } as any,
        amount: amount,
        type: TransactionType.BUY_IN,
        status: TransactionStatus.COMPLETED,
        description: `Table buy-in - Table ${request.tableNumber}${request.seatNumber ? `, Seat ${request.seatNumber}` : ''}`,
        processedBy: userId,
      });

      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: 'Buy-in request approved and balance updated',
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

    return {
      success: true,
      message: 'Buy-in request rejected',
      requestId: request.id,
    };
  }
}

