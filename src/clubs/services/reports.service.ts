import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Player } from '../entities/player.entity';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { CreditRequest } from '../entities/credit-request.entity';
import { SalaryPayment } from '../entities/salary-payment.entity';
import { DealerTips } from '../entities/dealer-tips.entity';
import { DealerCashout } from '../entities/dealer-cashout.entity';
import { PlayerBonus } from '../entities/player-bonus.entity';
import { StaffBonus } from '../entities/staff-bonus.entity';
import { Table } from '../entities/table.entity';
import { Club } from '../club.entity';
import { GenerateReportDto, ReportType } from '../dto/generate-report.dto';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Player)
    private readonly playerRepo: Repository<Player>,
    @InjectRepository(FinancialTransaction)
    private readonly transactionRepo: Repository<FinancialTransaction>,
    @InjectRepository(CreditRequest)
    private readonly creditRequestRepo: Repository<CreditRequest>,
    @InjectRepository(SalaryPayment)
    private readonly salaryPaymentRepo: Repository<SalaryPayment>,
    @InjectRepository(DealerTips)
    private readonly dealerTipsRepo: Repository<DealerTips>,
    @InjectRepository(DealerCashout)
    private readonly dealerCashoutRepo: Repository<DealerCashout>,
    @InjectRepository(PlayerBonus)
    private readonly playerBonusRepo: Repository<PlayerBonus>,
    @InjectRepository(StaffBonus)
    private readonly staffBonusRepo: Repository<StaffBonus>,
    @InjectRepository(Table)
    private readonly tableRepo: Repository<Table>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
  ) {}

  /**
   * Calculate player's current balance from all transactions
   * Balance = Deposits + Bonuses - Cashouts - Rake - Tips
   */
  private async calculatePlayerBalance(playerId: string): Promise<number> {
    const allTransactions = await this.transactionRepo.find({
      where: { playerId }
    });

    const deposits = allTransactions
      .filter(t => (t.type === 'Deposit' || t.type === 'Buy In' || t.type === 'Credit') && t.status === 'Completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const bonuses = allTransactions
      .filter(t => t.type === 'Bonus' && t.status === 'Completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const withdrawals = allTransactions
      .filter(t => (t.type === 'Cashout' || t.type === 'Withdrawal') && t.status === 'Completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const rake = allTransactions
      .filter(t => t.type === 'Rake' && t.status === 'Completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const tips = allTransactions
      .filter(t => t.type === 'Tip' && t.status === 'Completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    return deposits + bonuses - withdrawals - rake - tips;
  }

  async generateReport(clubId: string, dto: GenerateReportDto): Promise<Buffer> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day

    let reportData: any;

    switch (dto.reportType) {
      case ReportType.INDIVIDUAL_PLAYER:
        reportData = await this.generateIndividualPlayerReport(clubId, dto.playerId!, startDate, endDate);
        break;
      case ReportType.CUMULATIVE_PLAYER:
        reportData = await this.generateCumulativePlayerReport(clubId, startDate, endDate);
        break;
      case ReportType.DAILY_TRANSACTIONS:
        reportData = await this.generateDailyTransactionsReport(clubId, startDate, endDate);
        break;
      case ReportType.DAILY_RAKE:
        reportData = await this.generateDailyRakeReport(clubId, startDate, endDate);
        break;
      case ReportType.PER_TABLE_TRANSACTIONS:
        reportData = await this.generatePerTableTransactionsReport(clubId, dto.tableNumber, startDate, endDate);
        break;
      case ReportType.CREDIT_TRANSACTIONS:
        reportData = await this.generateCreditTransactionsReport(clubId, startDate, endDate);
        break;
      case ReportType.EXPENSES:
        reportData = await this.generateExpensesReport(clubId, startDate, endDate);
        break;
      case ReportType.BONUS:
        reportData = await this.generateBonusReport(clubId, startDate, endDate);
        break;
      case ReportType.CUSTOM:
        reportData = await this.generateCustomReport(clubId, dto.customReportTypes!, startDate, endDate);
        break;
      default:
        throw new BadRequestException('Invalid report type');
    }

    if (dto.format === 'excel') {
      return await this.generateExcel(reportData, dto.reportType, club.name);
    } else {
      return await this.generatePDF(reportData, dto.reportType, club.name);
    }
  }

  private async generateIndividualPlayerReport(clubId: string, playerId: string, startDate: Date, endDate: Date) {
    const player = await this.playerRepo.findOne({
      where: { id: playerId, club: { id: clubId } }
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    const transactions = await this.transactionRepo.find({
      where: {
        playerId: playerId,
        createdAt: Between(startDate, endDate)
      },
      order: { createdAt: 'DESC' }
    });

    const totalBuyIn = transactions
      .filter(t => t.type === 'Deposit' || t.type === 'Buy In')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalCashOut = transactions
      .filter(t => t.type === 'Cashout' || t.type === 'Withdrawal')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalRakePaid = transactions
      .filter(t => t.type === 'Rake')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalTipsPaid = transactions
      .filter(t => t.type === 'Tip')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const bonuses = await this.playerBonusRepo.find({
      where: {
        playerId: playerId,
        createdAt: Between(startDate, endDate)
      }
    });

    const totalBonus = bonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);

    // Calculate net profit/loss
    const netAmount = (totalCashOut + totalBonus) - totalBuyIn - totalRakePaid - totalTipsPaid;

    // Calculate current balance across all time
    const currentBalance = await this.calculatePlayerBalance(playerId);

    // Group transactions by type for detailed breakdown
    const transactionsByType = transactions.reduce((acc, t) => {
      const type = t.type;
      if (!acc[type]) {
        acc[type] = { count: 0, total: 0 };
      }
      acc[type].count++;
      acc[type].total += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return {
      title: 'Individual Player Report',
      playerInfo: {
        name: player.name,
        email: player.email,
        phone: player.phoneNumber,
        registeredOn: player.createdAt,
        kycStatus: player.kycStatus || 'Not Submitted',
        currentBalance
      },
      summary: {
        totalBuyIn,
        totalCashOut,
        totalRakePaid,
        totalTipsPaid,
        totalBonus,
        netAmount,
        totalTransactions: transactions.length,
        transactionsByType
      },
      transactions: transactions.map(t => ({
        date: t.createdAt,
        type: t.type,
        amount: parseFloat(t.amount.toString()),
        status: t.status,
        notes: t.notes || 'N/A',
        isOverridden: t.isOverridden || false
      })),
      bonuses: bonuses.map(b => ({
        date: b.createdAt,
        amount: parseFloat(b.bonusAmount.toString()),
        reason: b.reason || 'N/A',
        processedBy: b.processedBy || 'System'
      }))
    };
  }

  private async generateCumulativePlayerReport(clubId: string, startDate: Date, endDate: Date) {
    const players = await this.playerRepo.find({
      where: { club: { id: clubId } }
    });

    const playerData = await Promise.all(
      players.map(async (player) => {
        const transactions = await this.transactionRepo.find({
          where: {
            playerId: player.id,
            createdAt: Between(startDate, endDate)
          }
        });

        const totalBuyIn = transactions
          .filter(t => t.type === 'Deposit' || t.type === 'Buy In')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const totalCashOut = transactions
          .filter(t => t.type === 'Cashout' || t.type === 'Withdrawal')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const totalRake = transactions
          .filter(t => t.type === 'Rake')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const totalTips = transactions
          .filter(t => t.type === 'Tip')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const bonuses = await this.playerBonusRepo.find({
          where: {
            playerId: player.id,
            createdAt: Between(startDate, endDate)
          }
        });

        const totalBonus = bonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);

        const netProfit = (totalCashOut + totalBonus) - totalBuyIn - totalRake - totalTips;
        
        // Calculate current balance across all time
        const currentBalance = await this.calculatePlayerBalance(player.id);

        return {
          playerId: player.id,
          name: player.name,
          email: player.email,
          phone: player.phoneNumber || 'N/A',
          totalBuyIn,
          totalCashOut,
          totalRake,
          totalTips,
          totalBonus,
          netProfit,
          currentBalance,
          transactionCount: transactions.length,
          kycStatus: player.kycStatus || 'Not Submitted'
        };
      })
    );

    // Sort by net profit (highest to lowest)
    playerData.sort((a, b) => b.netProfit - a.netProfit);

    return {
      title: 'Cumulative Player Report',
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalPlayers: playerData.length,
        totalBuyIn: playerData.reduce((sum, p) => sum + p.totalBuyIn, 0),
        totalCashOut: playerData.reduce((sum, p) => sum + p.totalCashOut, 0),
        totalRake: playerData.reduce((sum, p) => sum + p.totalRake, 0),
        totalTips: playerData.reduce((sum, p) => sum + p.totalTips, 0),
        totalBonuses: playerData.reduce((sum, p) => sum + p.totalBonus, 0),
        totalNetProfit: playerData.reduce((sum, p) => sum + p.netProfit, 0),
        totalCurrentBalance: playerData.reduce((sum, p) => sum + p.currentBalance, 0),
        totalTransactions: playerData.reduce((sum, p) => sum + p.transactionCount, 0),
        averageNetPerPlayer: playerData.length > 0 ? playerData.reduce((sum, p) => sum + p.netProfit, 0) / playerData.length : 0,
        averageBalancePerPlayer: playerData.length > 0 ? playerData.reduce((sum, p) => sum + p.currentBalance, 0) / playerData.length : 0
      },
      players: playerData
    };
  }

  private async generateDailyTransactionsReport(clubId: string, startDate: Date, endDate: Date) {
    const transactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.club_id = :clubId', { clubId })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('transaction.created_at', 'DESC')
      .getMany();

    const byType = transactions.reduce((acc, t) => {
      const type = t.type;
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 };
      }
      acc[type].count++;
      acc[type].amount += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const byStatus = transactions.reduce((acc, t) => {
      const status = t.status;
      if (!acc[status]) {
        acc[status] = { count: 0, amount: 0 };
      }
      acc[status].count++;
      acc[status].amount += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    // Group by date for daily breakdown
    const byDate = transactions.reduce((acc, t) => {
      const date = t.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, deposits: 0, withdrawals: 0, rake: 0, tips: 0, total: 0 };
      }
      acc[date].count++;
      const amount = parseFloat(t.amount.toString());
      if (t.type === 'Deposit' || t.type === 'Buy In') acc[date].deposits += amount;
      else if (t.type === 'Cashout' || t.type === 'Withdrawal') acc[date].withdrawals += amount;
      else if (t.type === 'Rake') acc[date].rake += amount;
      else if (t.type === 'Tip') acc[date].tips += amount;
      acc[date].total += amount;
      return acc;
    }, {} as Record<string, { count: number; deposits: number; withdrawals: number; rake: number; tips: number; total: number }>);

    return {
      title: 'Daily Transactions Report',
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
        completedTransactions: transactions.filter(t => t.status === 'Completed').length,
        pendingTransactions: transactions.filter(t => t.status === 'Pending').length,
        byType,
        byStatus,
        byDate
      },
      transactions: transactions.map(t => ({
        date: t.createdAt,
        playerId: t.playerId,
        playerName: t.playerName || 'N/A',
        type: t.type,
        amount: parseFloat(t.amount.toString()),
        status: t.status,
        notes: t.notes || 'N/A',
        isOverridden: t.isOverridden || false,
        overrideReason: t.overrideReason || null
      }))
    };
  }

  private async generateDailyRakeReport(clubId: string, startDate: Date, endDate: Date) {
    const rakeTransactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.club_id = :clubId', { clubId })
      .andWhere('transaction.type = :type', { type: 'Rake' })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('transaction.created_at', 'DESC')
      .getMany();

    const totalRake = rakeTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Group by date for daily breakdown
    const byDate = rakeTransactions.reduce((acc, t) => {
      const date = t.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, amount: 0, players: new Set() };
      }
      acc[date].count++;
      acc[date].amount += parseFloat(t.amount.toString());
      acc[date].players.add(t.playerId);
      return acc;
    }, {} as Record<string, { count: number; amount: number; players: Set<string> }>);

    // Convert byDate to regular object (Set to count)
    const byDateFormatted = Object.entries(byDate).map(([date, data]) => ({
      date,
      transactions: data.count,
      totalRake: data.amount,
      uniquePlayers: data.players.size,
      averagePerTransaction: data.count > 0 ? data.amount / data.count : 0
    }));

    // Group by table if table info is in notes
    const byTable = rakeTransactions.reduce((acc, t) => {
      const tableInfo = t.notes || 'Unknown Table';
      if (!acc[tableInfo]) {
        acc[tableInfo] = { count: 0, amount: 0 };
      }
      acc[tableInfo].count++;
      acc[tableInfo].amount += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return {
      title: 'Daily Rake Report',
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalRake,
        totalTransactions: rakeTransactions.length,
        averageRake: rakeTransactions.length > 0 ? totalRake / rakeTransactions.length : 0,
        uniquePlayers: new Set(rakeTransactions.map(t => t.playerId)).size,
        byDate: byDateFormatted,
        byTable
      },
      transactions: rakeTransactions.map(t => ({
        date: t.createdAt,
        playerId: t.playerId,
        playerName: t.playerName || 'N/A',
        amount: parseFloat(t.amount.toString()),
        tableInfo: t.notes || 'N/A',
        status: t.status
      }))
    };
  }

  private async generatePerTableTransactionsReport(clubId: string, tableNumber: string | undefined, startDate: Date, endDate: Date) {
    let query = this.transactionRepo.createQueryBuilder('transaction')
      .where('transaction.club_id = :clubId', { clubId })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });

    if (tableNumber) {
      query = query.andWhere('transaction.notes ILIKE :tableNumber', { tableNumber: `%${tableNumber}%` });
    }

    const transactions = await query.orderBy('transaction.created_at', 'DESC').getMany();

    const byType = transactions.reduce((acc, t) => {
      const type = t.type;
      if (!acc[type]) {
        acc[type] = { count: 0, amount: 0 };
      }
      acc[type].count++;
      acc[type].amount += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    const deposits = transactions.filter(t => t.type === 'Deposit' || t.type === 'Buy In').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const cashouts = transactions.filter(t => t.type === 'Cashout' || t.type === 'Withdrawal').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const rake = transactions.filter(t => t.type === 'Rake').reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    return {
      title: `Per Table Transactions Report${tableNumber ? ` - Table ${tableNumber}` : ' - All Tables'}`,
      dateRange: {
        startDate,
        endDate
      },
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
        totalDeposits: deposits,
        totalCashouts: cashouts,
        totalRake: rake,
        uniquePlayers: new Set(transactions.map(t => t.playerId)).size,
        byType
      },
      transactions: transactions.map(t => ({
        date: t.createdAt,
        playerId: t.playerId,
        playerName: t.playerName || 'N/A',
        type: t.type,
        amount: parseFloat(t.amount.toString()),
        status: t.status,
        tableInfo: t.notes || 'N/A'
      }))
    };
  }

  private async generateCreditTransactionsReport(clubId: string, startDate: Date, endDate: Date) {
    const creditRequests = await this.creditRequestRepo
      .createQueryBuilder('credit')
      .where('credit.club_id = :clubId', { clubId })
      .andWhere('credit.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('credit.created_at', 'DESC')
      .getMany();

    const totalRequested = creditRequests.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
    const approvedRequests = creditRequests.filter(c => c.status === 'Approved');
    const totalApproved = approvedRequests.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

    return {
      title: 'Credit Transactions Report',
      summary: {
        totalRequests: creditRequests.length,
        approved: approvedRequests.length,
        pending: creditRequests.filter(c => c.status === 'Pending').length,
        rejected: creditRequests.filter(c => c.status === 'Denied').length,
        totalRequested,
        totalApproved
      },
      requests: creditRequests.map(c => ({
        date: c.createdAt,
        playerName: c.playerName,
        amount: c.amount,
        status: c.status,
        notes: c.notes
      }))
    };
  }

  private async generateExpensesReport(clubId: string, startDate: Date, endDate: Date) {
    const salaries = await this.salaryPaymentRepo
      .createQueryBuilder('salary')
      .leftJoinAndSelect('salary.staff', 'staff')
      .where('salary.club_id = :clubId', { clubId })
      .andWhere('salary.payment_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const tips = await this.dealerTipsRepo
      .createQueryBuilder('tips')
      .leftJoinAndSelect('tips.dealer', 'dealer')
      .where('tips.club_id = :clubId', { clubId })
      .andWhere('tips.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const cashouts = await this.dealerCashoutRepo
      .createQueryBuilder('cashout')
      .leftJoinAndSelect('cashout.dealer', 'dealer')
      .where('cashout.club_id = :clubId', { clubId })
      .andWhere('cashout.cashout_date BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const staffBonuses = await this.staffBonusRepo
      .createQueryBuilder('bonus')
      .leftJoinAndSelect('bonus.staff', 'staff')
      .where('bonus.club_id = :clubId', { clubId })
      .andWhere('bonus.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const totalSalaries = salaries.reduce((sum, s) => sum + parseFloat(s.netAmount.toString()), 0);
    const totalTips = tips.reduce((sum, t) => sum + parseFloat(t.dealerShareAmount.toString()), 0);
    const totalCashouts = cashouts.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
    const totalBonuses = staffBonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);

    return {
      title: 'Expenses Report',
      summary: {
        totalSalaries,
        totalTips,
        totalCashouts,
        totalBonuses,
        grandTotal: totalSalaries + totalTips + totalCashouts + totalBonuses
      },
      salaries: salaries.map(s => ({
        date: s.paymentDate,
        staffName: s.staff.name,
        baseSalary: s.baseSalary,
        overtime: s.overtimeAmount,
        deductions: s.deductions,
        netAmount: s.netAmount
      })),
      tips: tips.map(t => ({
        date: t.createdAt,
        dealerName: t.dealer.name,
        amount: t.dealerShareAmount
      })),
      cashouts: cashouts.map(c => ({
        date: c.cashoutDate,
        dealerName: c.dealer.name,
        amount: c.amount
      })),
      bonuses: staffBonuses.map(b => ({
        date: b.createdAt,
        staffName: b.staff.name,
        amount: b.bonusAmount,
        reason: b.reason
      }))
    };
  }

  private async generateBonusReport(clubId: string, startDate: Date, endDate: Date) {
    const playerBonuses = await this.playerBonusRepo
      .createQueryBuilder('bonus')
      .leftJoinAndSelect('bonus.player', 'player')
      .where('bonus.club_id = :clubId', { clubId })
      .andWhere('bonus.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const staffBonuses = await this.staffBonusRepo
      .createQueryBuilder('bonus')
      .leftJoinAndSelect('bonus.staff', 'staff')
      .where('bonus.club_id = :clubId', { clubId })
      .andWhere('bonus.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const totalPlayerBonuses = playerBonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);
    const totalStaffBonuses = staffBonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);

    return {
      title: 'Bonus Report',
      summary: {
        totalPlayerBonuses,
        totalStaffBonuses,
        grandTotal: totalPlayerBonuses + totalStaffBonuses,
        playerBonusCount: playerBonuses.length,
        staffBonusCount: staffBonuses.length
      },
      playerBonuses: playerBonuses.map(b => ({
        date: b.createdAt,
        playerName: b.player.name,
        amount: b.bonusAmount,
        reason: b.reason,
        processedBy: b.processedBy
      })),
      staffBonuses: staffBonuses.map(b => ({
        date: b.createdAt,
        staffName: b.staff.name,
        amount: b.bonusAmount,
        reason: b.reason,
        processedBy: b.processedBy
      }))
    };
  }

  private async generateCustomReport(clubId: string, reportTypes: ReportType[], startDate: Date, endDate: Date) {
    const customData: any = {
      title: 'Custom Report',
      sections: []
    };

    for (const reportType of reportTypes) {
      if (reportType === ReportType.CUSTOM) continue; // Skip custom in custom

      let sectionData: any;
      switch (reportType) {
        case ReportType.CUMULATIVE_PLAYER:
          sectionData = await this.generateCumulativePlayerReport(clubId, startDate, endDate);
          break;
        case ReportType.DAILY_TRANSACTIONS:
          sectionData = await this.generateDailyTransactionsReport(clubId, startDate, endDate);
          break;
        case ReportType.DAILY_RAKE:
          sectionData = await this.generateDailyRakeReport(clubId, startDate, endDate);
          break;
        case ReportType.CREDIT_TRANSACTIONS:
          sectionData = await this.generateCreditTransactionsReport(clubId, startDate, endDate);
          break;
        case ReportType.EXPENSES:
          sectionData = await this.generateExpensesReport(clubId, startDate, endDate);
          break;
        case ReportType.BONUS:
          sectionData = await this.generateBonusReport(clubId, startDate, endDate);
          break;
      }

      if (sectionData) {
        customData.sections.push(sectionData);
      }
    }

    return customData;
  }

  private async generateExcel(data: any, reportType: ReportType, clubName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = clubName;
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(data.title || 'Report');

    // Add title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = data.title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add club name
    worksheet.mergeCells('A2:F2');
    const clubCell = worksheet.getCell('A2');
    clubCell.value = clubName;
    clubCell.font = { size: 12 };
    clubCell.alignment = { horizontal: 'center' };

    worksheet.addRow([]);

    // Add summary
    if (data.summary) {
      worksheet.addRow(['Summary']).font = { bold: true };
      Object.entries(data.summary).forEach(([key, value]) => {
        worksheet.addRow([key, value]);
      });
      worksheet.addRow([]);
    }

    // Add data based on report type
    if (reportType === ReportType.INDIVIDUAL_PLAYER && data.playerInfo) {
      worksheet.addRow(['Player Information']).font = { bold: true };
      Object.entries(data.playerInfo).forEach(([key, value]) => {
        worksheet.addRow([key, value]);
      });
      worksheet.addRow([]);
    }

    // Add transactions/main data
    if (data.transactions && data.transactions.length > 0) {
      worksheet.addRow(['Transactions']).font = { bold: true };
      const headers = Object.keys(data.transactions[0]);
      worksheet.addRow(headers).font = { bold: true };
      data.transactions.forEach((row: any) => {
        worksheet.addRow(Object.values(row));
      });
    }

    if (data.players && data.players.length > 0) {
      worksheet.addRow(['Player Data']).font = { bold: true };
      const headers = Object.keys(data.players[0]);
      worksheet.addRow(headers).font = { bold: true };
      data.players.forEach((row: any) => {
        worksheet.addRow(Object.values(row));
      });
    }

    // Auto-fit columns
    worksheet.columns.forEach((column: any) => {
      let maxLength = 0;
      column.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const length = cell.value ? cell.value.toString().length : 10;
        if (length > maxLength) {
          maxLength = length;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generatePDF(data: any, reportType: ReportType, clubName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Helper to format currency
      const formatCurrency = (value: any): string => {
        const num = typeof value === 'number' ? value : parseFloat(value.toString());
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Helper to format date
      const formatDate = (value: any): string => {
        if (!value) return 'N/A';
        const date = new Date(value);
        return date.toLocaleString('en-IN', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };

      // Title
      doc.fontSize(20).font('Helvetica-Bold').text(data.title, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text(clubName, { align: 'center' });
      doc.fontSize(10).text(`Generated on: ${formatDate(new Date())}`, { align: 'center' });
      doc.moveDown();

      // Date Range
      if (data.dateRange) {
        doc.fontSize(10).font('Helvetica').text(
          `Period: ${formatDate(data.dateRange.startDate)} to ${formatDate(data.dateRange.endDate)}`,
          { align: 'center' }
        );
        doc.moveDown();
      }

      // Summary Section
      if (data.summary) {
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.fontSize(10).font('Helvetica');
        
        Object.entries(data.summary).forEach(([key, value]) => {
          // Skip nested objects for now
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            return;
          }
          
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          let formattedValue: string;
          
          if (typeof value === 'number' && (key.toLowerCase().includes('amount') || 
              key.toLowerCase().includes('total') || key.toLowerCase().includes('rake') ||
              key.toLowerCase().includes('deposit') || key.toLowerCase().includes('cashout') ||
              key.toLowerCase().includes('bonus') || key.toLowerCase().includes('tip') ||
              key.toLowerCase().includes('profit') || key.toLowerCase().includes('salary'))) {
            formattedValue = formatCurrency(value);
          } else if (typeof value === 'number') {
            formattedValue = value.toLocaleString('en-IN');
          } else {
            formattedValue = String(value);
          }
          
          doc.text(`${formattedKey}: ${formattedValue}`);
        });
        doc.moveDown();
      }

      // Player Information
      if (data.playerInfo) {
        doc.fontSize(14).font('Helvetica-Bold').text('Player Information', { underline: true });
        doc.fontSize(10).font('Helvetica');
        Object.entries(data.playerInfo).forEach(([key, value]) => {
          const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          const formattedValue = key.toLowerCase().includes('date') ? formatDate(value) : String(value);
          doc.text(`${formattedKey}: ${formattedValue}`);
        });
        doc.moveDown();
      }

      // Detailed Transactions Table
      if (data.transactions && data.transactions.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Transaction Details', { underline: true });
        doc.fontSize(8).font('Helvetica');
        
        // Table header
        const headers = Object.keys(data.transactions[0]);
        doc.font('Helvetica-Bold').text(headers.join(' | '), { continued: false });
        doc.font('Helvetica');
        
        // Table rows (limit to first 100 for PDF readability)
        data.transactions.slice(0, 100).forEach((txn: any) => {
          const row = Object.values(txn).map((val: any, idx) => {
            const key = headers[idx];
            if (key.toLowerCase().includes('date')) {
              return formatDate(val);
            } else if (key.toLowerCase().includes('amount') && typeof val === 'number') {
              return formatCurrency(val);
            } else {
              return String(val);
            }
          }).join(' | ');
          doc.text(row);
        });
        
        if (data.transactions.length > 100) {
          doc.moveDown();
          doc.fontSize(10).font('Helvetica-Oblique').text(`... and ${data.transactions.length - 100} more transactions. Download Excel for full details.`);
        }
      }

      // Player Data (for cumulative reports)
      if (data.players && data.players.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Player Summary', { underline: true });
        doc.fontSize(8).font('Helvetica');
        
        const headers = Object.keys(data.players[0]);
        doc.font('Helvetica-Bold').text(headers.join(' | '), { continued: false });
        doc.font('Helvetica');
        
        data.players.slice(0, 50).forEach((player: any) => {
          const row = Object.values(player).map((val: any, idx) => {
            const key = headers[idx];
            if (key.toLowerCase().includes('date')) {
              return formatDate(val);
            } else if ((key.toLowerCase().includes('amount') || key.toLowerCase().includes('total') || 
                       key.toLowerCase().includes('net') || key.toLowerCase().includes('profit')) && 
                       typeof val === 'number') {
              return formatCurrency(val);
            } else {
              return String(val);
            }
          }).join(' | ');
          doc.text(row);
        });
        
        if (data.players.length > 50) {
          doc.moveDown();
          doc.fontSize(10).font('Helvetica-Oblique').text(`... and ${data.players.length - 50} more players. Download Excel for full details.`);
        }
      }

      // Bonuses section
      if (data.bonuses && data.bonuses.length > 0) {
        doc.addPage();
        doc.fontSize(14).font('Helvetica-Bold').text('Bonuses', { underline: true });
        doc.fontSize(9).font('Helvetica');
        
        data.bonuses.forEach((bonus: any, index: number) => {
          doc.text(`${index + 1}. Date: ${formatDate(bonus.date)}, Amount: ${formatCurrency(bonus.amount)}, Reason: ${bonus.reason || 'N/A'}`);
        });
      }

      doc.end();
    });
  }
}

