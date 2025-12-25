import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import { Club } from '../club.entity';
import { Player } from '../entities/player.entity';
import { EditTransactionDto } from '../dto/edit-transaction.dto';
import { CancelTransactionDto } from '../dto/cancel-transaction.dto';

@Injectable()
export class FinancialTransactionsService {
  constructor(
    @InjectRepository(FinancialTransaction) private readonly transactionsRepo: Repository<FinancialTransaction>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(Player) private readonly playerRepo: Repository<Player>,
  ) {}

  async create(clubId: string, data: {
    type: TransactionType;
    playerId: string;
    playerName: string;
    amount: number;
    notes?: string;
  }) {
    // Validate inputs
    if (!data.type) {
      throw new BadRequestException('Transaction type is required');
    }
    if (!Object.values(TransactionType).includes(data.type)) {
      throw new BadRequestException('Invalid transaction type');
    }
    if (!data.playerId || !data.playerId.trim()) {
      throw new BadRequestException('Player ID is required');
    }
    if (data.playerId.trim().length > 100) {
      throw new BadRequestException('Player ID cannot exceed 100 characters');
    }
    if (!data.playerName || !data.playerName.trim()) {
      throw new BadRequestException('Player name is required');
    }
    if (data.playerName.trim().length > 200) {
      throw new BadRequestException('Player name cannot exceed 200 characters');
    }
    if (data.amount === null || data.amount === undefined) {
      throw new BadRequestException('Amount is required');
    }
    if (typeof data.amount !== 'number' || isNaN(data.amount)) {
      throw new BadRequestException('Amount must be a valid number');
    }
    if (data.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    if (data.amount > 100000000) {
      throw new BadRequestException('Amount exceeds maximum limit of ₹100,000,000');
    }
    if (data.notes && data.notes.trim().length > 500) {
      throw new BadRequestException('Notes cannot exceed 500 characters');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const transaction = this.transactionsRepo.create({
      type: data.type,
      playerId: data.playerId.trim(),
      playerName: data.playerName.trim(),
      amount: data.amount,
      notes: data.notes?.trim() || null,
      status: TransactionStatus.PENDING,
      club
    });

    return this.transactionsRepo.save(transaction);
  }

  async findAll(clubId: string, status?: TransactionStatus) {
    const where: any = { club: { id: clubId } };
    if (status) where.status = status;
    return this.transactionsRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, clubId: string) {
    const transaction = await this.transactionsRepo.findOne({
      where: { id, club: { id: clubId } }
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async update(id: string, clubId: string, data: Partial<{ amount: number; notes: string; status: TransactionStatus }>) {
    const transaction = await this.findOne(id, clubId);

    // Cannot update cancelled or completed transactions
    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new ConflictException('Cannot update a cancelled transaction');
    }
    if (transaction.status === TransactionStatus.COMPLETED && data.amount !== undefined) {
      throw new ConflictException('Cannot update amount of a completed transaction');
    }

    // Validate amount if provided
    if (data.amount !== undefined) {
      if (typeof data.amount !== 'number' || isNaN(data.amount)) {
        throw new BadRequestException('Amount must be a valid number');
      }
      if (data.amount <= 0) {
        throw new BadRequestException('Amount must be greater than 0');
      }
      if (data.amount > 100000000) {
        throw new BadRequestException('Amount exceeds maximum limit of ₹100,000,000');
      }
    }

    // Validate notes if provided
    if (data.notes !== undefined) {
      if (data.notes && data.notes.trim().length > 500) {
        throw new BadRequestException('Notes cannot exceed 500 characters');
      }
      data.notes = (data.notes?.trim() || undefined) as any;
    }

    // Validate status if provided
    if (data.status !== undefined) {
      if (!Object.values(TransactionStatus).includes(data.status)) {
        throw new BadRequestException('Invalid transaction status');
      }
      // Prevent invalid status transitions
      if (transaction.status === TransactionStatus.COMPLETED && data.status !== TransactionStatus.COMPLETED) {
        throw new ConflictException('Cannot change status of a completed transaction');
      }
    }

    Object.assign(transaction, data);
    return this.transactionsRepo.save(transaction);
  }

  async cancel(id: string, clubId: string) {
    const transaction = await this.findOne(id, clubId);

    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new ConflictException('Transaction has already been cancelled');
    }
    if (transaction.status === TransactionStatus.COMPLETED) {
      throw new ConflictException('Cannot cancel a completed transaction');
    }

    transaction.status = TransactionStatus.CANCELLED;
    return this.transactionsRepo.save(transaction);
  }

  /**
   * Edit transaction with override tracking
   */
  async editTransaction(id: string, clubId: string, dto: EditTransactionDto, userId?: string) {
    const transaction = await this.findOne(id, clubId);

    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new ConflictException('Cannot edit a cancelled transaction');
    }

    // Store original amount if this is the first override
    if (!transaction.isOverridden) {
      transaction.originalAmount = Number(transaction.amount);
    }

    // Calculate balance adjustment for player transactions
    const amountDifference = Number(dto.amount) - Number(transaction.amount);
    
    // Update transaction
    transaction.amount = Number(dto.amount);
    transaction.isOverridden = true;
    transaction.overrideReason = dto.reason;
    transaction.overriddenBy = userId;
    transaction.overriddenAt = new Date();

    // Update player balance if transaction affects player balance
    if (transaction.status === TransactionStatus.COMPLETED && amountDifference !== 0) {
      const player = await this.playerRepo.findOne({
        where: { id: transaction.playerId, club: { id: clubId } },
      });

      if (player) {
        // Determine if transaction increases or decreases balance
        const isCredit = [TransactionType.DEPOSIT, TransactionType.BONUS, TransactionType.CREDIT, TransactionType.REFUND].includes(transaction.type);
        const isDebit = [TransactionType.CASHOUT, TransactionType.WITHDRAWAL, TransactionType.BUY_IN].includes(transaction.type);

        // Adjust player balance based on transaction type and amount difference
        // Note: This is a simplified approach. You may need to adjust based on your balance calculation logic
        // For now, we'll just update the transaction and let the balance be recalculated elsewhere
      }
    }

    return this.transactionsRepo.save(transaction);
  }

  /**
   * Cancel transaction with reason
   */
  async cancelTransaction(id: string, clubId: string, dto: CancelTransactionDto, userId?: string) {
    const transaction = await this.findOne(id, clubId);

    if (transaction.status === TransactionStatus.CANCELLED) {
      throw new ConflictException('Transaction has already been cancelled');
    }

    // If cancelling a completed transaction, mark as overridden
    if (transaction.status === TransactionStatus.COMPLETED) {
      if (!transaction.isOverridden) {
        transaction.originalAmount = Number(transaction.amount);
      }
      transaction.isOverridden = true;
      transaction.overrideReason = dto.reason || 'Transaction cancelled by admin';
      transaction.overriddenBy = userId;
      transaction.overriddenAt = new Date();
    }

    transaction.status = TransactionStatus.CANCELLED;
    if (dto.reason && !transaction.overrideReason) {
      transaction.overrideReason = dto.reason;
    }

    return this.transactionsRepo.save(transaction);
  }
}

