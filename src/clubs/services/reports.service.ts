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
      .filter(t => t.type === 'Deposit')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalCashOut = transactions
      .filter(t => t.type === 'Cashout')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const bonuses = await this.playerBonusRepo.find({
      where: {
        playerId: playerId,
        createdAt: Between(startDate, endDate)
      }
    });

    const totalBonus = bonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);

    return {
      title: 'Individual Player Report',
      playerInfo: {
        name: player.name,
        email: player.email,
        phone: player.phoneNumber,
        currentBalance: 0 // Balance not stored in player entity
      },
      summary: {
        totalBuyIn,
        totalCashOut,
        totalBonus,
        netAmount: totalCashOut - totalBuyIn
      },
      transactions: transactions.map(t => ({
        date: t.createdAt,
        type: t.type,
        amount: t.amount,
        status: t.status,
        notes: t.notes
      })),
      bonuses: bonuses.map(b => ({
        date: b.createdAt,
        amount: b.bonusAmount,
        reason: b.reason,
        processedBy: b.processedBy
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
          .filter(t => t.type === 'Deposit')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        const totalCashOut = transactions
          .filter(t => t.type === 'Cashout')
          .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

        return {
          name: player.name,
          email: player.email,
          totalBuyIn,
          totalCashOut,
          netAmount: totalCashOut - totalBuyIn,
          currentBalance: 0,
          transactionCount: transactions.length
        };
      })
    );

    return {
      title: 'Cumulative Player Report',
      summary: {
        totalPlayers: playerData.length,
        totalBuyIn: playerData.reduce((sum, p) => sum + p.totalBuyIn, 0),
        totalCashOut: playerData.reduce((sum, p) => sum + p.totalCashOut, 0),
        totalBalance: 0
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

    return {
      title: 'Daily Transactions Report',
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
        byType
      },
      transactions: transactions.map(t => ({
        date: t.createdAt,
        playerName: t.playerName || 'N/A',
        type: t.type,
        amount: t.amount,
        status: t.status,
        notes: t.notes
      }))
    };
  }

  private async generateDailyRakeReport(clubId: string, startDate: Date, endDate: Date) {
    const rakeTransactions = await this.transactionRepo
      .createQueryBuilder('transaction')
      .where('transaction.club_id = :clubId', { clubId })
      .andWhere('transaction.type = :type', { type: 'rake' })
      .andWhere('transaction.created_at BETWEEN :startDate AND :endDate', { startDate, endDate })
      .orderBy('transaction.created_at', 'DESC')
      .getMany();

    const totalRake = rakeTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    // Group by date
    const byDate = rakeTransactions.reduce((acc, t) => {
      const date = t.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { count: 0, amount: 0 };
      }
      acc[date].count++;
      acc[date].amount += parseFloat(t.amount.toString());
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return {
      title: 'Daily Rake Report',
      summary: {
        totalRake,
        totalTransactions: rakeTransactions.length,
        averageRake: rakeTransactions.length > 0 ? totalRake / rakeTransactions.length : 0
      },
      byDate,
      transactions: rakeTransactions.map(t => ({
        date: t.createdAt,
        amount: t.amount,
        tableNumber: t.notes || 'N/A'
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

    return {
      title: `Per Table Transactions Report${tableNumber ? ` - Table ${tableNumber}` : ''}`,
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
      },
      transactions: transactions.map(t => ({
        date: t.createdAt,
        playerName: t.playerName || 'N/A',
        type: t.type,
        amount: t.amount,
        tableInfo: t.notes
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
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(20).text(data.title, { align: 'center' });
      doc.fontSize(12).text(clubName, { align: 'center' });
      doc.moveDown();

      // Summary
      if (data.summary) {
        doc.fontSize(14).text('Summary', { underline: true });
        doc.fontSize(10);
        Object.entries(data.summary).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`);
        });
        doc.moveDown();
      }

      // Player Info
      if (data.playerInfo) {
        doc.fontSize(14).text('Player Information', { underline: true });
        doc.fontSize(10);
        Object.entries(data.playerInfo).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`);
        });
        doc.moveDown();
      }

      // Transactions
      if (data.transactions && data.transactions.length > 0) {
        doc.fontSize(14).text('Transactions', { underline: true });
        doc.fontSize(8);
        data.transactions.slice(0, 50).forEach((txn: any, index: number) => {
          doc.text(`${index + 1}. ${JSON.stringify(txn)}`);
        });
      }

      doc.end();
    });
  }
}

