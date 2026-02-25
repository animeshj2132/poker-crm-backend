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
import { RakeCollection } from '../entities/rake-collection.entity';
import { GenerateReportDto, ReportType } from '../dto/generate-report.dto';
import { CreditRequestStatus } from '../entities/credit-request.entity';
import { TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

/** Standard report output: exact template columns and rows for Excel/PDF */
export interface ReportSheet {
  reportName: string;
  headers: string[];
  rows: Record<string, string | number>[];
}

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
    @InjectRepository(RakeCollection)
    private readonly rakeCollectionRepo: Repository<RakeCollection>,
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

  private formatReportDate(d: Date): string {
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  private isBuyInType(type: string): boolean {
    return [TransactionType.DEPOSIT, TransactionType.BUY_IN, TransactionType.TABLE_BUY_IN, TransactionType.CLUB_BUY_IN].includes(type as TransactionType);
  }

  private isCashoutType(type: string): boolean {
    return [TransactionType.CASHOUT, TransactionType.WITHDRAWAL, TransactionType.TABLE_BUY_OUT, TransactionType.CLUB_BUY_OUT].includes(type as TransactionType);
  }

  private async generateIndividualPlayerReport(clubId: string, playerId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const player = await this.playerRepo.findOne({
      where: { id: playerId, club: { id: clubId } }
    });
    if (!player) throw new NotFoundException('Player not found');

    const transactions = await this.transactionRepo.find({
      where: { club: { id: clubId }, playerId, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'DESC' }
    });
    const completed = transactions.filter(t => t.status === TransactionStatus.COMPLETED);

    const totalDeposit = completed
      .filter(t => this.isBuyInType(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const totalCashout = completed
      .filter(t => this.isCashoutType(t.type))
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const bonuses = await this.playerBonusRepo.find({
      where: { club: { id: clubId }, playerId, createdAt: Between(startDate, endDate) }
    });
    const totalBonus = bonuses.reduce((sum, b) => sum + parseFloat(b.bonusAmount.toString()), 0);
    const creditTx = completed.filter(t => t.type === TransactionType.CREDIT);
    const totalCredit = creditTx.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const nameParts = (player.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      reportName: 'Individual Report',
      headers: ['Signup Date', 'First Name', 'Last Name', 'Phone Number', 'Email Address', 'KYC Status', 'Total Bonus', 'Total Credit', 'Total Deposit', 'Total Cashout'],
      rows: [{
        'Signup Date': this.formatReportDate(player.createdAt),
        'First Name': firstName,
        'Last Name': lastName,
        'Phone Number': player.phoneNumber || '',
        'Email Address': player.email || '',
        'KYC Status': player.kycStatus || 'Not Submitted',
        'Total Bonus': Number(totalBonus.toFixed(2)),
        'Total Credit': Number(totalCredit.toFixed(2)),
        'Total Deposit': Number(totalDeposit.toFixed(2)),
        'Total Cashout': Number(totalCashout.toFixed(2))
      }]
    };
  }

  private async generateCumulativePlayerReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet | { sections: ReportSheet[] }> {
    const transactions = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) }
    });
    const playerBonuses = await this.playerBonusRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) }
    });
    const completedTx = transactions.filter(t => t.status === TransactionStatus.COMPLETED);

    const byDate: Record<string, { players: Set<string>; buyin: number; cashout: number; rake: number; tips: number; bonus: number }> = {};
    for (const t of completedTx) {
      const date = this.formatReportDate(t.createdAt);
      if (!byDate[date]) byDate[date] = { players: new Set(), buyin: 0, cashout: 0, rake: 0, tips: 0, bonus: 0 };
      byDate[date].players.add(t.playerId);
      const amt = parseFloat(t.amount.toString());
      if (this.isBuyInType(t.type)) byDate[date].buyin += amt;
      else if (this.isCashoutType(t.type)) byDate[date].cashout += amt;
      else if (t.type === TransactionType.RAKE) byDate[date].rake += amt;
      else if (t.type === TransactionType.TIP) byDate[date].tips += amt;
    }
    for (const b of playerBonuses) {
      const date = this.formatReportDate(b.createdAt);
      if (!byDate[date]) byDate[date] = { players: new Set(), buyin: 0, cashout: 0, rake: 0, tips: 0, bonus: 0 };
      byDate[date].bonus += parseFloat(b.bonusAmount.toString());
    }

    const sortedDates = Object.keys(byDate).sort();
    const dateRows = sortedDates.map(date => {
      const d = byDate[date];
      return {
        'Date': date,
        'Total Players': d.players.size,
        'Total Buyin': Number(d.buyin.toFixed(2)),
        'Total Cashout': Number(d.cashout.toFixed(2)),
        'Total Rake': Number(d.rake.toFixed(2)),
        'Total Tips': Number(d.tips.toFixed(2)),
        'Total Bonus': Number(d.bonus.toFixed(2))
      };
    });
    const dateSheet: ReportSheet = {
      reportName: 'Cumulative Player Report (By Date)',
      headers: ['Date', 'Total Players', 'Total Buyin', 'Total Cashout', 'Total Rake', 'Total Tips', 'Total Bonus'],
      rows: dateRows
    };

    // Per-player sheet with real names: Player Net = Total Cashout - Total Buyin (positive = player profit). Club Retained = Total Buyin - Total Cashout.
    const players = await this.playerRepo.find({
      where: { club: { id: clubId } },
      order: { name: 'ASC' }
    });
    const byPlayer: Record<string, { buyin: number; cashout: number; rake: number; tips: number; bonus: number }> = {};
    for (const t of completedTx) {
      const pid = t.playerId;
      if (!byPlayer[pid]) byPlayer[pid] = { buyin: 0, cashout: 0, rake: 0, tips: 0, bonus: 0 };
      const amt = parseFloat(t.amount.toString());
      if (this.isBuyInType(t.type)) byPlayer[pid].buyin += amt;
      else if (this.isCashoutType(t.type)) byPlayer[pid].cashout += amt;
      else if (t.type === TransactionType.RAKE) byPlayer[pid].rake += amt;
      else if (t.type === TransactionType.TIP) byPlayer[pid].tips += amt;
    }
    for (const b of playerBonuses) {
      const pid = b.playerId;
      if (!byPlayer[pid]) byPlayer[pid] = { buyin: 0, cashout: 0, rake: 0, tips: 0, bonus: 0 };
      byPlayer[pid].bonus += parseFloat(b.bonusAmount.toString());
    }

    const playerIdsInRange = new Set(Object.keys(byPlayer));
    const activePlayers = players.filter(p => playerIdsInRange.has(p.id));
    let totalBuyinAll = 0;
    let totalCashoutAll = 0;
    let totalRakeAll = 0;
    let totalTipsAll = 0;
    let totalBonusAll = 0;
    for (const pid of Object.keys(byPlayer)) {
      totalBuyinAll += byPlayer[pid].buyin;
      totalCashoutAll += byPlayer[pid].cashout;
      totalRakeAll += byPlayer[pid].rake;
      totalTipsAll += byPlayer[pid].tips;
      totalBonusAll += byPlayer[pid].bonus;
    }
    const playerRows = activePlayers.map(p => {
      const d = byPlayer[p.id] || { buyin: 0, cashout: 0, rake: 0, tips: 0, bonus: 0 };
      const buyin = Number(d.buyin.toFixed(2));
      const cashout = Number(d.cashout.toFixed(2));
      const playerNet = cashout - d.buyin;
      return {
        'Name': p.name || 'N/A',
        'Email': p.email || '',
        'Phone Number': p.phoneNumber || '',
        'Total Buyin': buyin,
        'Total Cashout': cashout,
        'Total Rake': Number(d.rake.toFixed(2)),
        'Total Tips': Number(d.tips.toFixed(2)),
        'Total Bonus': Number(d.bonus.toFixed(2)),
        'Player Net': Number(playerNet.toFixed(2))
      };
    });
    const clubRetained = Number((totalBuyinAll - totalCashoutAll).toFixed(2));
    playerRows.push({
      'Name': 'TOTAL (Club Retained)',
      'Email': '',
      'Phone Number': '',
      'Total Buyin': Number(totalBuyinAll.toFixed(2)),
      'Total Cashout': Number(totalCashoutAll.toFixed(2)),
      'Total Rake': Number(totalRakeAll.toFixed(2)),
      'Total Tips': Number(totalTipsAll.toFixed(2)),
      'Total Bonus': Number(totalBonusAll.toFixed(2)),
      'Player Net': clubRetained
    });
    const playerSheet: ReportSheet = {
      reportName: 'Cumulative Player Report (Player Summary)',
      headers: ['Name', 'Email', 'Phone Number', 'Total Buyin', 'Total Cashout', 'Total Rake', 'Total Tips', 'Total Bonus', 'Player Net'],
      rows: playerRows
    };

    return { sections: [dateSheet, playerSheet] };
  }

  private async generateDailyTransactionsReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const transactions = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate), status: TransactionStatus.COMPLETED }
    });
    const byDate: Record<string, { deposit: number; cashout: number }> = {};
    for (const t of transactions) {
      const date = this.formatReportDate(t.createdAt);
      if (!byDate[date]) byDate[date] = { deposit: 0, cashout: 0 };
      const amt = parseFloat(t.amount.toString());
      if (this.isBuyInType(t.type)) byDate[date].deposit += amt;
      else if (this.isCashoutType(t.type)) byDate[date].cashout += amt;
    }
    const sortedDates = Object.keys(byDate).sort();
    const rows = sortedDates.map(date => ({
      'Date': date,
      'Total Deposit': Number(byDate[date].deposit.toFixed(2)),
      'Total Cashout': Number(byDate[date].cashout.toFixed(2))
    }));
    return {
      reportName: 'Daily Transaction Report',
      headers: ['Date', 'Total Deposit', 'Total Cashout'],
      rows
    };
  }

  private async generateDailyRakeReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const collections = await this.rakeCollectionRepo.find({
      where: { club: { id: clubId } },
      order: { sessionDate: 'ASC' }
    });
    const filtered = collections.filter(c => {
      const d = new Date(c.sessionDate);
      return d >= startDate && d <= endDate;
    });
    const tableNumbers = [...new Set(filtered.map(c => c.tableNumber))].sort((a, b) => a - b).slice(0, 7);
    const tableCols = tableNumbers.length > 0 ? tableNumbers.map((_, i) => `Table Name ${i + 1}`) : ['Table Name 1'];
    const headers = ['Date', ...tableCols, 'Total Rake'];

    const byDate: Record<string, Record<number, number>> = {};
    for (const c of filtered) {
      const date = this.formatReportDate(new Date(c.sessionDate));
      if (!byDate[date]) byDate[date] = {};
      const amt = Number(c.totalRakeAmount || 0);
      byDate[date][c.tableNumber] = (byDate[date][c.tableNumber] || 0) + amt;
    }
    const sortedDates = Object.keys(byDate).sort();
    const rows = sortedDates.map(date => {
      const row: Record<string, string | number> = { 'Date': date };
      let total = 0;
      tableNumbers.forEach((tn, i) => {
        const val = byDate[date][tn] || 0;
        row[tableCols[i]] = Number(val.toFixed(2));
        total += val;
      });
      row['Total Rake'] = Number(total.toFixed(2));
      return row;
    });

    return { reportName: 'Daily Rake', headers, rows };
  }

  private async generatePerTableTransactionsReport(clubId: string, _tableNumber: string | undefined, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const transactions = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) }
    });
    const collections = await this.rakeCollectionRepo.find({
      where: { club: { id: clubId } }
    });
    const filteredRake = collections.filter(c => {
      const d = new Date(c.sessionDate);
      return d >= startDate && d <= endDate;
    });
    const tableNumbers = [...new Set(filteredRake.map(c => c.tableNumber))].sort((a, b) => a - b).slice(0, 6);
    const tableCols = tableNumbers.map((_, i) => `Table Name ${i + 1}`);
    const headers = ['Date', ...tableCols, 'Total Players', 'Total Buyin', 'Total Cashout', 'Total Rake'];

    const byDate: Record<string, { players: Set<string>; buyin: number; cashout: number; tableRake: Record<number, number> }> = {};
    const completedTx = transactions.filter(t => t.status === TransactionStatus.COMPLETED);
    for (const t of completedTx) {
      const date = this.formatReportDate(t.createdAt);
      if (!byDate[date]) byDate[date] = { players: new Set(), buyin: 0, cashout: 0, tableRake: {} };
      byDate[date].players.add(t.playerId);
      const amt = parseFloat(t.amount.toString());
      if (this.isBuyInType(t.type)) byDate[date].buyin += amt;
      else if (this.isCashoutType(t.type)) byDate[date].cashout += amt;
    }
    for (const c of filteredRake) {
      const date = this.formatReportDate(new Date(c.sessionDate));
      if (!byDate[date]) byDate[date] = { players: new Set(), buyin: 0, cashout: 0, tableRake: {} };
      const amt = Number(c.totalRakeAmount || 0);
      byDate[date].tableRake[c.tableNumber] = (byDate[date].tableRake[c.tableNumber] || 0) + amt;
    }
    const sortedDates = Object.keys(byDate).sort();
    const rows = sortedDates.map(date => {
      const d = byDate[date];
      const totalRakeFromCollections = Object.values(d.tableRake).reduce((a, b) => a + b, 0);
      const row: Record<string, string | number> = {
        'Date': date,
        'Total Players': d.players.size,
        'Total Buyin': Number(d.buyin.toFixed(2)),
        'Total Cashout': Number(d.cashout.toFixed(2)),
        'Total Rake': Number(totalRakeFromCollections.toFixed(2))
      };
      tableNumbers.forEach((tn, i) => {
        row[tableCols[i]] = d.tableRake[tn] != null ? Number(d.tableRake[tn].toFixed(2)) : '';
      });
      return row;
    });

    return { reportName: 'Per Table Transaction Report', headers, rows };
  }

  private creditStatusToTemplate(status: CreditRequestStatus): string {
    if (status === CreditRequestStatus.APPROVED) return 'Success';
    if (status === CreditRequestStatus.PENDING) return 'Pending';
    if (status === CreditRequestStatus.DENIED) return 'Rejected';
    return 'Failed';
  }

  private async generateCreditTransactionsReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const creditRequests = await this.creditRequestRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'DESC' }
    });
    return {
      reportName: 'Credit Transaction Report',
      headers: ['Date', 'Player Name', 'Amount', 'Status'],
      rows: creditRequests.map(c => ({
        'Date': this.formatReportDate(c.createdAt),
        'Player Name': c.playerName || '',
        'Amount': Number(parseFloat(c.amount.toString()).toFixed(2)),
        'Status': this.creditStatusToTemplate(c.status as CreditRequestStatus)
      }))
    };
  }

  private async generateExpensesReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const salaries = await this.salaryPaymentRepo.find({
      where: { club: { id: clubId } },
      relations: ['staff']
    });
    const tips = await this.dealerTipsRepo.find({
      where: { clubId },
      relations: ['dealer']
    });
    const cashouts = await this.dealerCashoutRepo.find({
      where: { club: { id: clubId } },
      relations: ['dealer']
    });
    const staffBonuses = await this.staffBonusRepo.find({
      where: { club: { id: clubId } },
      relations: ['staff']
    });

    const byDate: Record<string, { bonus: number; salaries: number; tips: number; cashout: number }> = {};
    const add = (dateStr: string, key: 'bonus' | 'salaries' | 'tips' | 'cashout', value: number) => {
      if (!byDate[dateStr]) byDate[dateStr] = { bonus: 0, salaries: 0, tips: 0, cashout: 0 };
      byDate[dateStr][key] += value;
    };
    salaries.filter(s => s.paymentDate && new Date(s.paymentDate) >= startDate && new Date(s.paymentDate) <= endDate).forEach(s => {
      add(this.formatReportDate(new Date(s.paymentDate)), 'salaries', parseFloat(s.netAmount.toString()));
    });
    tips.filter(t => t.tipDate && new Date(t.tipDate) >= startDate && new Date(t.tipDate) <= endDate).forEach(t => {
      const paidToDealer = Number(t.dealerShareAmount || 0) + Number(t.floorManagerAmount || 0);
      add(this.formatReportDate(new Date(t.tipDate)), 'tips', paidToDealer);
    });
    cashouts.filter(c => c.cashoutDate && new Date(c.cashoutDate) >= startDate && new Date(c.cashoutDate) <= endDate).forEach(c => {
      add(this.formatReportDate(new Date(c.cashoutDate)), 'cashout', parseFloat(c.amount.toString()));
    });
    staffBonuses.filter(b => b.createdAt && new Date(b.createdAt) >= startDate && new Date(b.createdAt) <= endDate).forEach(b => {
      add(this.formatReportDate(b.createdAt), 'bonus', parseFloat(b.bonusAmount.toString()));
    });

    const sortedDates = Object.keys(byDate).sort();
    const rows = sortedDates.map(date => {
      const d = byDate[date];
      const totalExpense = d.bonus + d.salaries + d.tips + d.cashout;
      return {
        'Date': date,
        'Total Bonus': Number(d.bonus.toFixed(2)),
        'Total Salaries': Number(d.salaries.toFixed(2)),
        'Total Tips': Number(d.tips.toFixed(2)),
        'Total Cashout': Number(d.cashout.toFixed(2)),
        'Total Expense': Number(totalExpense.toFixed(2))
      };
    });

    return {
      reportName: 'Consolidated Expense Report',
      headers: ['Date', 'Total Bonus', 'Total Salaries', 'Total Tips', 'Total Cashout', 'Total Expense'],
      rows
    };
  }

  private async generateBonusReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const playerBonuses = await this.playerBonusRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      relations: ['player']
    });
    const staffBonuses = await this.staffBonusRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      relations: ['staff']
    });
    const playerRows = playerBonuses.map(b => ({
      'Date': this.formatReportDate(b.createdAt),
      'Name': (b as { player?: { name: string } }).player?.name ?? 'N/A',
      'Player/Staff': 'Player',
      'Amount': Number(parseFloat(b.bonusAmount.toString()).toFixed(2))
    }));
    const staffRows = staffBonuses.map(b => ({
      'Date': this.formatReportDate(b.createdAt),
      'Name': (b as { staff?: { name: string } }).staff?.name ?? 'N/A',
      'Player/Staff': 'Staff',
      'Amount': Number(parseFloat(b.bonusAmount.toString()).toFixed(2))
    }));
    const rows = [...playerRows, ...staffRows].sort((a, b) => (a['Date'] as string).localeCompare(b['Date'] as string));
    return {
      reportName: 'Bonus Report',
      headers: ['Date', 'Name', 'Player/Staff', 'Amount'],
      rows
    };
  }

  private async generateCustomReport(clubId: string, reportTypes: ReportType[], startDate: Date, endDate: Date): Promise<{ sections: ReportSheet[] }> {
    const sections: ReportSheet[] = [];
    for (const reportType of reportTypes) {
      if (reportType === ReportType.CUSTOM) continue;
      let sheetOrSections: ReportSheet | { sections: ReportSheet[] } | null = null;
      switch (reportType) {
        case ReportType.CUMULATIVE_PLAYER:
          sheetOrSections = await this.generateCumulativePlayerReport(clubId, startDate, endDate);
          break;
        case ReportType.DAILY_TRANSACTIONS:
          sheetOrSections = await this.generateDailyTransactionsReport(clubId, startDate, endDate);
          break;
        case ReportType.DAILY_RAKE:
          sheetOrSections = await this.generateDailyRakeReport(clubId, startDate, endDate);
          break;
        case ReportType.PER_TABLE_TRANSACTIONS:
          sheetOrSections = await this.generatePerTableTransactionsReport(clubId, undefined, startDate, endDate);
          break;
        case ReportType.CREDIT_TRANSACTIONS:
          sheetOrSections = await this.generateCreditTransactionsReport(clubId, startDate, endDate);
          break;
        case ReportType.EXPENSES:
          sheetOrSections = await this.generateExpensesReport(clubId, startDate, endDate);
          break;
        case ReportType.BONUS:
          sheetOrSections = await this.generateBonusReport(clubId, startDate, endDate);
          break;
        default:
          break;
      }
      if (sheetOrSections) {
        if ('sections' in sheetOrSections) sections.push(...sheetOrSections.sections);
        else sections.push(sheetOrSections);
      }
    }
    return { sections };
  }

  private addSheetToWorkbook(workbook: ExcelJS.Workbook, sheet: ReportSheet, clubName: string): void {
    const safeName = sheet.reportName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
    const worksheet = workbook.addWorksheet(safeName, { properties: { tabColor: { argb: 'FF92D050' } } });
    let rowNum = 1;
    worksheet.getCell(rowNum, 1).value = 'REPORT NAME';
    worksheet.getCell(rowNum, 1).font = { bold: true };
    worksheet.getCell(rowNum, 2).value = sheet.reportName;
    worksheet.getCell(rowNum, 2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    rowNum += 1;
    worksheet.getCell(rowNum, 1).value = clubName;
    rowNum += 2;
    sheet.headers.forEach((h, i) => {
      worksheet.getCell(rowNum, i + 1).value = h;
      worksheet.getCell(rowNum, i + 1).font = { bold: true };
    });
    rowNum += 1;
    sheet.rows.forEach(r => {
      sheet.headers.forEach((h, i) => {
        const v = r[h];
        worksheet.getCell(rowNum, i + 1).value = v !== undefined && v !== null && v !== '' ? v : '';
      });
      rowNum += 1;
    });
    worksheet.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 50);
    });
  }

  private async generateExcel(data: ReportSheet | { sections: ReportSheet[] }, reportType: ReportType, clubName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = clubName;
    workbook.created = new Date();

    if ('sections' in data && Array.isArray(data.sections)) {
      data.sections.forEach((sheet) => this.addSheetToWorkbook(workbook, sheet, clubName));
    } else {
      this.addSheetToWorkbook(workbook, data as ReportSheet, clubName);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private writeSheetToPDF(doc: PDFKit.PDFDocument, sheet: ReportSheet, clubName: string): void {
    const margin = 50;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - 2 * margin;
    const fontSize = 9;
    const rowHeight = 14;
    const cellPad = 4;
    const numCols = sheet.headers.length;
    const colWidth = numCols > 0 ? contentWidth / numCols : contentWidth;
    const gridColor = '#b0b0b0';
    const gridWidth = 0.25;

    const isNumber = (v: string | number): boolean => typeof v === 'number' && !isNaN(v);
    const cellStr = (v: string | number | undefined | null): string => {
      if (v === undefined || v === null || v === '') return '';
      return isNumber(v) ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v);
    };

    // Title block – same as Excel: REPORT NAME + report name, then club
    doc.fontSize(10).font('Helvetica-Bold').text('REPORT NAME', margin, doc.y, { continued: true });
    doc.font('Helvetica').text(`  ${sheet.reportName}`);
    doc.fontSize(fontSize).text(clubName, margin, doc.y + 4);
    doc.y += 28;

    if (numCols === 0) {
      doc.moveDown(1);
      return;
    }

    const numRows = 1 + sheet.rows.length; // header + data
    const tableTop = doc.y;
    const tableHeight = numRows * rowHeight;

    // Draw grid (Excel-style): vertical lines for each column, horizontal for each row
    doc.strokeColor(gridColor).lineWidth(gridWidth);
    for (let c = 0; c <= numCols; c++) {
      const x = margin + c * colWidth;
      doc.moveTo(x, tableTop).lineTo(x, tableTop + tableHeight).stroke();
    }
    for (let r = 0; r <= numRows; r++) {
      const y = tableTop + r * rowHeight;
      doc.moveTo(margin, y).lineTo(margin + contentWidth, y).stroke();
    }

    // Header row (bold) – same as Excel
    doc.font('Helvetica-Bold').fontSize(fontSize);
    let y = tableTop + (rowHeight - fontSize) / 2;
    let x = margin;
    sheet.headers.forEach((h) => {
      doc.text(String(h), x + cellPad, y, { width: colWidth - cellPad * 2 });
      x += colWidth;
    });

    // Data rows – same structure as Excel
    doc.font('Helvetica').fontSize(fontSize);
    sheet.rows.forEach((r, rowIdx) => {
      y = tableTop + rowHeight + rowIdx * rowHeight + (rowHeight - fontSize) / 2;
      x = margin;
      sheet.headers.forEach((h) => {
        doc.text(cellStr(r[h]), x + cellPad, y, { width: colWidth - cellPad * 2 });
        x += colWidth;
      });
    });

    doc.y = tableTop + tableHeight + 14;
  }

  private async generatePDF(data: ReportSheet | { sections: ReportSheet[] }, _reportType: ReportType, clubName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const sheets = 'sections' in data && Array.isArray(data.sections) ? data.sections : [data as ReportSheet];
      sheets.forEach((sheet, idx) => {
        if (idx > 0) {
          doc.addPage();
          doc.y = 50;
        } else {
          doc.fontSize(8).fillColor('#666666').text(`Generated: ${new Date().toLocaleString('en-IN')}`, 50, 50, { align: 'right', width: 495 });
          doc.y = 62;
          doc.fillColor('black');
        }
        this.writeSheetToPDF(doc, sheet, clubName);
      });

      doc.end();
    });
  }
}

