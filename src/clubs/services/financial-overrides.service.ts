import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { PlayerBonus } from '../entities/player-bonus.entity';
import { StaffBonus } from '../entities/staff-bonus.entity';
import { SalaryPayment } from '../entities/salary-payment.entity';
import { DealerCashout } from '../entities/dealer-cashout.entity';

export interface UnifiedTransaction {
  id: string;
  type: string;
  category: 'player' | 'staff';
  entityId: string;
  entityName: string;
  amount: number;
  status: string;
  date: Date;
  notes?: string;
  originalAmount?: number;
  overrideReason?: string;
  isOverridden?: boolean;
  transactionId?: string; // For financial transactions
}

@Injectable()
export class FinancialOverridesService {
  constructor(
    @InjectRepository(FinancialTransaction)
    private readonly financialTransactionRepo: Repository<FinancialTransaction>,
    @InjectRepository(PlayerBonus)
    private readonly playerBonusRepo: Repository<PlayerBonus>,
    @InjectRepository(StaffBonus)
    private readonly staffBonusRepo: Repository<StaffBonus>,
    @InjectRepository(SalaryPayment)
    private readonly salaryPaymentRepo: Repository<SalaryPayment>,
    @InjectRepository(DealerCashout)
    private readonly dealerCashoutRepo: Repository<DealerCashout>,
  ) {}

  /**
   * Get all transactions (player and staff) for a club
   */
  async getAllTransactions(
    clubId: string,
    category?: 'player' | 'staff',
    subCategory?: 'dealer-cashout' | 'salary-bonus',
    page: number = 1,
    limit: number = 50,
  ) {
    const transactions: UnifiedTransaction[] = [];

    // Get player transactions if category is 'player' or not specified
    if (!category || category === 'player') {
      // Financial transactions
      const financialTransactions = await this.financialTransactionRepo
        .createQueryBuilder('transaction')
        .leftJoin('transaction.club', 'club')
        .where('club.id = :clubId', { clubId })
        .orderBy('transaction.createdAt', 'DESC')
        .getMany();

      for (const tx of financialTransactions) {
        transactions.push({
          id: tx.id,
          type: tx.type,
          category: 'player',
          entityId: tx.playerId,
          entityName: tx.playerName,
          amount: Number(tx.amount),
          status: tx.status,
          date: tx.createdAt,
          notes: tx.notes || undefined,
          originalAmount: tx.originalAmount ? Number(tx.originalAmount) : undefined,
          overrideReason: tx.overrideReason,
          isOverridden: tx.isOverridden,
          transactionId: tx.id,
        });
      }

      // Player bonuses
      const playerBonuses = await this.playerBonusRepo.find({
        where: { clubId },
        relations: ['player'],
        order: { processedAt: 'DESC' },
      });

      for (const bonus of playerBonuses) {
        transactions.push({
          id: bonus.id,
          type: 'Player Bonus',
          category: 'player',
          entityId: bonus.playerId,
          entityName: bonus.player?.name || 'Unknown',
          amount: Number(bonus.bonusAmount),
          status: 'Completed',
          date: bonus.processedAt,
          notes: bonus.reason,
        });
      }
    }

    // Get staff transactions if category is 'staff' or not specified
    if (!category || category === 'staff') {
      try {
        // If subCategory is 'dealer-cashout' or not specified, get dealer cashouts
        if (!subCategory || subCategory === 'dealer-cashout') {
          // Dealer cashouts
          const dealerCashouts = await this.dealerCashoutRepo
            .createQueryBuilder('cashout')
            .leftJoinAndSelect('cashout.dealer', 'dealer')
            .where('cashout.club_id = :clubId', { clubId })
            .orderBy('cashout.cashout_date', 'DESC')
            .getMany();

          for (const cashout of dealerCashouts) {
            // Check if transaction has been overridden (contains [OVERRIDE] in notes)
            const isOverridden = cashout.notes?.includes('[OVERRIDE]') || false;
            const overrideReason = isOverridden 
              ? cashout.notes?.split('[OVERRIDE]')[1]?.trim() 
              : undefined;
            
            transactions.push({
              id: cashout.id,
              type: 'Dealer Cashout',
              category: 'staff',
              entityId: cashout.dealerId,
              entityName: cashout.dealer?.name || 'Unknown',
              amount: Number(cashout.amount || 0),
              status: 'Completed',
              date: cashout.cashoutDate || cashout.createdAt,
              notes: cashout.notes,
              isOverridden,
              overrideReason,
            });
          }
        }

        // If subCategory is 'salary-bonus' or not specified, get salary and bonuses
        if (!subCategory || subCategory === 'salary-bonus') {
          // Staff bonuses
          const staffBonuses = await this.staffBonusRepo
            .createQueryBuilder('bonus')
            .leftJoinAndSelect('bonus.staff', 'staff')
            .where('bonus.club_id = :clubId', { clubId })
            .orderBy('bonus.processed_at', 'DESC')
            .getMany();

          for (const bonus of staffBonuses) {
            transactions.push({
              id: bonus.id,
              type: 'Staff Bonus',
              category: 'staff',
              entityId: bonus.staffId,
              entityName: bonus.staff?.name || 'Unknown',
              amount: Number(bonus.bonusAmount || 0),
              status: 'Completed',
              date: bonus.processedAt || bonus.createdAt,
              notes: bonus.reason,
            });
          }

          // Salary payments
          const salaryPayments = await this.salaryPaymentRepo
            .createQueryBuilder('salary')
            .leftJoinAndSelect('salary.staff', 'staff')
            .where('salary.club_id = :clubId', { clubId })
            .orderBy('salary.payment_date', 'DESC')
            .getMany();

          for (const salary of salaryPayments) {
            // Check if transaction has been overridden (contains [OVERRIDE] in notes)
            const isOverridden = salary.notes?.includes('[OVERRIDE]') || false;
            const overrideReason = isOverridden 
              ? salary.notes?.split('[OVERRIDE]')[1]?.trim() 
              : undefined;
            
            transactions.push({
              id: salary.id,
              type: 'Salary Payment',
              category: 'staff',
              entityId: salary.staffId,
              entityName: salary.staff?.name || 'Unknown',
              amount: Number(salary.netAmount || 0),
              status: salary.status || 'Processed',
              date: salary.paymentDate || salary.createdAt,
              notes: salary.notes,
              isOverridden,
              overrideReason,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching staff transactions:', error);
        // Log the full error for debugging
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        throw error;
      }
    }

    // Sort all transactions by date (newest first)
    transactions.sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });

    // Apply pagination
    const total = transactions.length;
    const skip = (page - 1) * limit;
    const paginatedTransactions = transactions.slice(skip, skip + limit);

    return {
      transactions: paginatedTransactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Edit ANY transaction type (financial, dealer cashout, or salary payment)
   */
  async editAnyTransaction(id: string, clubId: string, amount: number, reason: string, userId?: string) {
    // Try to find in financial_transactions first
    let transaction = await this.financialTransactionRepo.findOne({
      where: { id, club: { id: clubId } },
    });

    if (transaction) {
      // Edit financial transaction
      if (!transaction.isOverridden) {
        transaction.originalAmount = Number(transaction.amount);
      }
      transaction.amount = Number(amount);
      transaction.isOverridden = true;
      transaction.overrideReason = reason;
      transaction.overriddenBy = userId;
      transaction.overriddenAt = new Date();
      return await this.financialTransactionRepo.save(transaction);
    }

    // Try to find in dealer_cashouts
    let dealerCashout = await this.dealerCashoutRepo.findOne({
      where: { id, clubId },
    });

    if (dealerCashout) {
      // Edit dealer cashout
      dealerCashout.amount = Number(amount);
      dealerCashout.notes = `${dealerCashout.notes || ''}\n[OVERRIDE] ${reason}`.trim();
      return await this.dealerCashoutRepo.save(dealerCashout);
    }

    // Try to find in salary_payments
    let salaryPayment = await this.salaryPaymentRepo.findOne({
      where: { id, clubId },
    });

    if (salaryPayment) {
      // Edit salary payment - update netAmount (not amount)
      salaryPayment.netAmount = Number(amount);
      salaryPayment.notes = `${salaryPayment.notes || ''}\n[OVERRIDE] ${reason}`.trim();
      return await this.salaryPaymentRepo.save(salaryPayment);
    }

    throw new NotFoundException('Transaction not found');
  }
}

