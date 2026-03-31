import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Player } from '../entities/player.entity';
import { FinancialTransaction } from '../entities/financial-transaction.entity';
import { CreditRequest } from '../entities/credit-request.entity';
import { SalaryPayment } from '../entities/salary-payment.entity';
import { DealerTips } from '../entities/dealer-tips.entity';
import { DealerCashout } from '../entities/dealer-cashout.entity';
import { PlayerBonus } from '../entities/player-bonus.entity';
import { StaffBonus } from '../entities/staff-bonus.entity';
import { Table, TableType } from '../entities/table.entity';
import { Club } from '../club.entity';
import { RakeCollection } from '../entities/rake-collection.entity';
import { FnbOrder, OrderStatus } from '../entities/fnb-order.entity';
import { BuyInRequest } from '../entities/buyin-request.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { ManagerCashout } from '../entities/manager-cashout.entity';
import { BuyOutRequest } from '../entities/buyout-request.entity';
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
    @InjectRepository(FnbOrder)
    private readonly fnbOrderRepo: Repository<FnbOrder>,
    @InjectRepository(BuyInRequest)
    private readonly buyInRequestRepo: Repository<BuyInRequest>,
    @InjectRepository(InventoryItem)
    private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(ManagerCashout)
    private readonly managerCashoutRepo: Repository<ManagerCashout>,
    @InjectRepository(BuyOutRequest)
    private readonly buyOutRequestRepo: Repository<BuyOutRequest>,
  ) {}

  private async tiltIdByPlayerUuid(clubId: string, playerUuids: string[]): Promise<Map<string, string | null>> {
    const unique = [...new Set((playerUuids || []).filter(Boolean))];
    if (!unique.length) return new Map();
    const rows = await this.playerRepo.find({
      where: { club: { id: clubId }, id: In(unique) },
      select: ['id', 'playerId'],
    });
    return new Map(rows.map((p) => [p.id, p.playerId ?? null]));
  }

  private num(v: unknown): number {
    const n = parseFloat(String(v ?? 0));
    return Number.isFinite(n) ? n : 0;
  }

  /** Wallet balance per product rules (F&B and credit excluded). */
  private async walletBalanceForPlayer(clubId: string, playerId: string): Promise<number> {
    const raw = await this.transactionRepo
      .createQueryBuilder('t')
      .select(
        `COALESCE(SUM(
          CASE
            WHEN UPPER(TRIM(t.type)) IN ('DEPOSIT', 'CLUB BUY IN', 'TABLE BUY OUT', 'BONUS', 'REFUND', 'TOURNAMENT WIN')
              AND t.status = :completed THEN t.amount
            WHEN UPPER(TRIM(t.type)) IN ('WITHDRAWAL', 'CLUB BUY OUT', 'TABLE BUY IN', 'CASHOUT', 'DEBIT', 'BUY IN', 'REGISTER')
              AND t.status = :completed THEN -t.amount
            ELSE 0
          END
        ), 0)`,
        'bal',
      )
      .where('t.club_id = :clubId', { clubId })
      .andWhere('t.player_id = :playerId', { playerId })
      .setParameter('completed', TransactionStatus.COMPLETED)
      .getRawOne();
    return this.num(raw?.bal);
  }

  /** Credit used (Credit tx − Debit payback), completed only. */
  private async creditOutstandingForPlayer(clubId: string, playerId: string): Promise<number> {
    const raw = await this.transactionRepo
      .createQueryBuilder('t')
      .select(
        `COALESCE(SUM(
          CASE
            WHEN UPPER(TRIM(t.type)) = 'CREDIT' AND t.status = :completed THEN t.amount
            WHEN UPPER(TRIM(t.type)) = 'DEBIT' AND t.status = :completed THEN -t.amount
            ELSE 0
          END
        ), 0)`,
        'bal',
      )
      .where('t.club_id = :clubId', { clubId })
      .andWhere('t.player_id = :playerId', { playerId })
      .setParameter('completed', TransactionStatus.COMPLETED)
      .getRawOne();
    return this.num(raw?.bal);
  }

  /** Outstanding credit per player (all time, completed Credit − Debit). */
  private async creditOutstandingMap(clubId: string): Promise<Map<string, number>> {
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.player_id', 'playerId')
      .addSelect(
        `COALESCE(SUM(
          CASE
            WHEN UPPER(TRIM(t.type)) = 'CREDIT' AND t.status = :completed THEN t.amount
            WHEN UPPER(TRIM(t.type)) = 'DEBIT' AND t.status = :completed THEN -t.amount
            ELSE 0
          END
        ), 0)`,
        'outstanding',
      )
      .where('t.club_id = :clubId', { clubId })
      .groupBy('t.player_id')
      .setParameter('completed', TransactionStatus.COMPLETED)
      .getRawMany();
    const m = new Map<string, number>();
    for (const r of rows) {
      m.set(r.playerId, this.num(r.outstanding));
    }
    return m;
  }

  private async walletBalancesForPlayers(clubId: string, playerIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (!playerIds.length) return map;
    const unique = [...new Set(playerIds)];
    const rows = await this.transactionRepo
      .createQueryBuilder('t')
      .select('t.player_id', 'playerId')
      .addSelect(
        `COALESCE(SUM(
          CASE
            WHEN UPPER(TRIM(t.type)) IN ('DEPOSIT', 'CLUB BUY IN', 'TABLE BUY OUT', 'BONUS', 'REFUND', 'TOURNAMENT WIN')
              AND t.status = :completed THEN t.amount
            WHEN UPPER(TRIM(t.type)) IN ('WITHDRAWAL', 'CLUB BUY OUT', 'TABLE BUY IN', 'CASHOUT', 'DEBIT', 'BUY IN', 'REGISTER')
              AND t.status = :completed THEN -t.amount
            ELSE 0
          END
        ), 0)`,
        'bal',
      )
      .where('t.club_id = :clubId', { clubId })
      .andWhere('t.player_id IN (:...ids)', { ids: unique })
      .groupBy('t.player_id')
      .setParameter('completed', TransactionStatus.COMPLETED)
      .getRawMany();
    for (const r of rows) {
      map.set(r.playerId, this.num(r.bal));
    }
    for (const id of unique) {
      if (!map.has(id)) map.set(id, 0);
    }
    return map;
  }

  private formatReportDateTime(d: Date): string {
    return d.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    });
  }

  private txnCategory(type: string): string {
    const u = (type || '').toUpperCase();
    if (['CREDIT', 'DEBIT'].includes(u)) return 'Credit line';
    if (['RAKE', 'TIP'].includes(u)) return 'Table/Club ops';
    if (['TABLE BUY IN', 'TABLE BUY OUT'].includes(u)) return 'Table wallet';
    if (['CLUB BUY IN', 'CLUB BUY OUT', 'DEPOSIT', 'CASHOUT', 'WITHDRAWAL'].includes(u)) return 'Club wallet';
    if (['REGISTER', 'BUY IN'].includes(u)) return 'Tournament / Buy-in';
    if (u === 'BONUS' || u === 'TOURNAMENT WIN' || u === 'REFUND') return 'Promo / Payout';
    return 'Other';
  }

  private tableGameLabel(tableType: TableType | string | null | undefined): string {
    if (tableType === TableType.RUMMY || String(tableType).toUpperCase() === 'RUMMY') return 'Rummy';
    return 'Poker';
  }

  private parseTableNumberFilter(raw: string | undefined): number | null {
    if (raw == null || String(raw).trim() === '') return null;
    const n = parseInt(String(raw).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  private normalizeReportText(value: unknown, maxLen = 300): string {
    const s = String(value ?? '')
      .replace(/\r?\n|\r/g, ' | ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!s) return '';
    return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s;
  }

  private extractTournamentName(type: string, notes?: string | null): string {
    const n = String(notes || '').trim();
    if (!n) return '';
    if (!/tournament/i.test(n) && !['BUY IN', 'REGISTER', 'TOURNAMENT WIN'].includes((type || '').toUpperCase())) {
      return '';
    }
    const parts = n.split(' - ').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      for (let i = 1; i < parts.length; i++) {
        const p = parts[i];
        if (/^position\b/i.test(p)) continue;
        if (/^₹/.test(p)) continue;
        if (/^\(₹/.test(p)) continue;
        if (/^id:\s*/i.test(p)) continue;
        return p;
      }
    }
    const m = n.match(/tournament[^-]*-\s*([^-\n\r]+)/i);
    return m?.[1]?.trim() || '';
  }

  private compactSections(data: ReportSheet | { sections: ReportSheet[] }): ReportSheet | { sections: ReportSheet[] } {
    const keep = (s: ReportSheet) => Array.isArray(s.rows) && s.rows.length > 0;
    const noDataSheet: ReportSheet = {
      reportName: 'Report — No data in selected period',
      headers: ['Message'],
      rows: [{ Message: 'No records found for the selected date range.' }],
    };
    if ('sections' in data && Array.isArray(data.sections)) {
      const sections = data.sections.filter(keep);
      return sections.length > 0 ? { sections } : { sections: [noDataSheet] };
    }
    const sheet = data as ReportSheet;
    return keep(sheet) ? sheet : { sections: [noDataSheet] };
  }

  private inRange(d: Date | string | null | undefined, startDate: Date, endDate: Date): boolean {
    if (!d) return false;
    const dt = new Date(d);
    return dt >= startDate && dt <= endDate;
  }

  async generateReport(clubId: string, dto: GenerateReportDto): Promise<Buffer> {
    const club = await this.clubRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    endDate.setHours(23, 59, 59, 999); // End of day
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid report date range');
    }
    if (startDate > endDate) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
    if (dto.reportType === ReportType.INDIVIDUAL_PLAYER && !dto.playerId) {
      throw new BadRequestException('playerId is required for individual player report');
    }
    if (dto.reportType === ReportType.CUSTOM && (!dto.customReportTypes || dto.customReportTypes.length === 0)) {
      throw new BadRequestException('customReportTypes is required for custom report');
    }

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
    reportData = this.compactSections(reportData);

    const periodLabel = `${dto.startDate} → ${dto.endDate}`;
    if (dto.format === 'excel') {
      return await this.generateExcel(reportData, dto.reportType, club.name, periodLabel);
    } else {
      return await this.generatePDF(reportData, dto.reportType, club.name, periodLabel);
    }
  }

  private formatReportDate(d: Date): string {
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Asia/Kolkata' });
  }

  private isBuyInType(type: string): boolean {
    return [TransactionType.DEPOSIT, TransactionType.BUY_IN, TransactionType.TABLE_BUY_IN, TransactionType.CLUB_BUY_IN].includes(type as TransactionType);
  }

  private isCashoutType(type: string): boolean {
    return [TransactionType.CASHOUT, TransactionType.WITHDRAWAL, TransactionType.TABLE_BUY_OUT, TransactionType.CLUB_BUY_OUT].includes(type as TransactionType);
  }

  private async generateIndividualPlayerReport(
    clubId: string,
    playerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ sections: ReportSheet[] }> {
    const player = await this.playerRepo.findOne({
      where: { id: playerId, club: { id: clubId } },
    });
    if (!player) throw new NotFoundException('Player not found');

    const transactions = await this.transactionRepo.find({
      where: { club: { id: clubId }, playerId, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });
    const completed = transactions.filter((t) => t.status === TransactionStatus.COMPLETED);

    const totalBuyIns = completed
      .filter((t) => this.isBuyInType(t.type))
      .reduce((sum, t) => sum + this.num(t.amount), 0);
    const totalCashouts = completed
      .filter((t) => this.isCashoutType(t.type))
      .reduce((sum, t) => sum + this.num(t.amount), 0);
    const bonusRows = await this.playerBonusRepo.find({
      where: { club: { id: clubId }, playerId, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });
    const totalBonusFromTable = bonusRows.reduce((sum, b) => sum + this.num(b.bonusAmount), 0);
    const bonusFromTx = completed
      .filter((t) => t.type === TransactionType.BONUS)
      .reduce((sum, t) => sum + this.num(t.amount), 0);
    const totalBonus = totalBonusFromTable + bonusFromTx;

    const creditGranted = completed
      .filter((t) => t.type === TransactionType.CREDIT)
      .reduce((sum, t) => sum + this.num(t.amount), 0);
    const creditRepaid = completed
      .filter((t) => t.type === TransactionType.DEBIT)
      .reduce((sum, t) => sum + this.num(t.amount), 0);

    const fnbOrders = await this.fnbOrderRepo.find({
      where: { club: { id: clubId }, playerId },
      order: { createdAt: 'ASC' },
    });
    const fnbInRange = fnbOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });
    const fnbBillable = fnbInRange.filter((o) =>
      [OrderStatus.DELIVERED, OrderStatus.READY, OrderStatus.PROCESSING, OrderStatus.PENDING].includes(o.status),
    );
    const totalFnbSpend = fnbBillable.reduce((s, o) => s + this.num(o.totalAmount), 0);

    const walletBalance = await this.walletBalanceForPlayer(clubId, playerId);
    const creditOutstanding = await this.creditOutstandingForPlayer(clubId, playerId);

    const nameParts = (player.name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const summarySheet: ReportSheet = {
      reportName: 'Player Report — Summary',
      headers: [
        'Field',
        'Value',
      ],
      rows: [
        { Field: 'Report period', Value: `${this.formatReportDate(startDate)} → ${this.formatReportDate(endDate)}` },
        { Field: 'First name', Value: firstName },
        { Field: 'Last name', Value: lastName },
        { Field: 'Player Tilt ID', Value: player.playerId || '' },
        { Field: 'Email', Value: player.email || '' },
        { Field: 'Phone', Value: player.phoneNumber || '' },
        { Field: 'KYC status', Value: player.kycStatus || 'Not Submitted' },
        { Field: 'Signup date', Value: this.formatReportDate(player.createdAt) },
        { Field: 'Current wallet balance (excl. F&B & credit line)', Value: Number(walletBalance.toFixed(2)) },
        { Field: 'Outstanding credit (Credit − Debit, completed)', Value: Number(creditOutstanding.toFixed(2)) },
        { Field: 'Credit limit', Value: player.creditEnabled ? Number(this.num(player.creditLimit).toFixed(2)) : 'Credit locked' },
        { Field: 'Total buy-ins (range, completed)', Value: Number(totalBuyIns.toFixed(2)) },
        { Field: 'Total cashouts / buy-outs (range, completed)', Value: Number(totalCashouts.toFixed(2)) },
        { Field: 'Total bonuses (range: bonus records + Bonus tx)', Value: Number(totalBonus.toFixed(2)) },
        { Field: 'Credit granted (range, completed)', Value: Number(creditGranted.toFixed(2)) },
        { Field: 'Credit repaid / Debit (range, completed)', Value: Number(creditRepaid.toFixed(2)) },
        { Field: 'F&B orders total (range; not wallet)', Value: Number(totalFnbSpend.toFixed(2)) },
        { Field: 'F&B order count (range)', Value: fnbInRange.length },
      ],
    };

    const walletLedger: ReportSheet = {
      reportName: 'Player Report — Wallet & credit transactions',
      headers: [
        'Timestamp (IST)',
        'Type',
        'Status',
        'Amount',
        'Category',
        'Game',
        'Tournament',
        'Notes',
      ],
      rows: transactions.map((t) => ({
        'Timestamp (IST)': this.formatReportDateTime(t.createdAt),
        Type: t.type,
        Status: t.status,
        Amount: Number(this.num(t.amount).toFixed(2)),
        Category: this.txnCategory(t.type),
        Game: t.gameType === 'rummy' ? 'Rummy' : t.gameType === 'poker' ? 'Poker' : t.gameType || '',
        Tournament: this.extractTournamentName(t.type, t.notes || t.overrideReason || ''),
        Notes: this.normalizeReportText(t.notes || t.overrideReason || '', 220),
      })),
    };

    const bonusDetail: ReportSheet = {
      reportName: 'Player Report — Bonus records',
      headers: ['Timestamp (IST)', 'Bonus type', 'Amount', 'Reason'],
      rows: bonusRows.map((b) => ({
        'Timestamp (IST)': this.formatReportDateTime(b.createdAt),
        'Bonus type': b.bonusType,
        Amount: Number(this.num(b.bonusAmount).toFixed(2)),
        Reason: this.normalizeReportText(b.reason || '', 220),
      })),
    };

    const fnbSheet: ReportSheet = {
      reportName: 'Player Report — F&B (separate from wallet)',
      headers: [
        'Timestamp (IST)',
        'Order #',
        'Table',
        'Status',
        'Amount',
        'Items summary',
      ],
      rows: fnbInRange.map((o) => ({
        'Timestamp (IST)': this.formatReportDateTime(o.createdAt),
        'Order #': o.orderNumber || o.id,
        Table: o.tableNumber,
        Status: o.status,
        Amount: Number(this.num(o.totalAmount).toFixed(2)),
        'Items summary': Array.isArray(o.items)
          ? this.normalizeReportText(o.items.map((i) => `${i.name}×${i.quantity}`).join('; '), 260)
          : '',
      })),
    };

    return { sections: [summarySheet, walletLedger, bonusDetail, fnbSheet] };
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
    const walletMap = await this.walletBalancesForPlayers(
      clubId,
      activePlayers.map((p) => p.id),
    );

    const aggTx = (pid: string) => {
      let tableBuyIn = 0;
      let tableBuyOut = 0;
      let clubBuyIn = 0;
      let clubBuyOut = 0;
      let tournamentBuy = 0;
      let rake = 0;
      for (const t of completedTx) {
        if (t.playerId !== pid) continue;
        const a = this.num(t.amount);
        const ty = (t.type || '').toString();
        if (ty === TransactionType.TABLE_BUY_IN) tableBuyIn += a;
        else if (ty === TransactionType.TABLE_BUY_OUT) tableBuyOut += a;
        else if (ty === TransactionType.CLUB_BUY_IN || ty === TransactionType.DEPOSIT) clubBuyIn += a;
        else if (ty === TransactionType.CLUB_BUY_OUT || ty === TransactionType.CASHOUT || ty === TransactionType.WITHDRAWAL)
          clubBuyOut += a;
        else if (ty === TransactionType.REGISTER || ty === TransactionType.BUY_IN) tournamentBuy += a;
        else if (ty === TransactionType.RAKE) rake += a;
      }
      return { tableBuyIn, tableBuyOut, clubBuyIn, clubBuyOut, tournamentBuy, rake };
    };

    const playerRows = activePlayers.map((p) => {
      const d = byPlayer[p.id] || { buyin: 0, cashout: 0, rake: 0, tips: 0, bonus: 0 };
      const buyin = Number(d.buyin.toFixed(2));
      const cashout = Number(d.cashout.toFixed(2));
      const playerNet = cashout - d.buyin;
      const split = aggTx(p.id);
      const wb = walletMap.get(p.id) ?? 0;
      return {
        Name: p.name || 'N/A',
        'Player Tilt ID': p.playerId || '',
        Email: p.email || '',
        'Phone Number': p.phoneNumber || '',
        'Current wallet balance': Number(wb.toFixed(2)),
        'Total buy-in (all types, range)': buyin,
        'Total cashout (all types, range)': cashout,
        'Table buy-in (range)': Number(split.tableBuyIn.toFixed(2)),
        'Table buy-out (range)': Number(split.tableBuyOut.toFixed(2)),
        'Club buy-in / deposit (range)': Number(split.clubBuyIn.toFixed(2)),
        'Club cashout / buy-out (range)': Number(split.clubBuyOut.toFixed(2)),
        'Tournament / register buy (range)': Number(split.tournamentBuy.toFixed(2)),
        'Rake (player-attributed, range)': Number(d.rake.toFixed(2)),
        'Tips (range)': Number(d.tips.toFixed(2)),
        'Bonus (range)': Number(d.bonus.toFixed(2)),
        'Player net (cashout − buy-in, range)': Number(playerNet.toFixed(2)),
      };
    });
    const clubRetained = Number((totalBuyinAll - totalCashoutAll).toFixed(2));
    let sumTableIn = 0;
    let sumTableOut = 0;
    let sumClubIn = 0;
    let sumClubOut = 0;
    let sumTourn = 0;
    for (const p of activePlayers) {
      const s = aggTx(p.id);
      sumTableIn += s.tableBuyIn;
      sumTableOut += s.tableBuyOut;
      sumClubIn += s.clubBuyIn;
      sumClubOut += s.clubBuyOut;
      sumTourn += s.tournamentBuy;
    }
    const walletSum = activePlayers.reduce((acc, p) => acc + (walletMap.get(p.id) ?? 0), 0);
    playerRows.push({
      Name: 'TOTAL (club retained = Σ buy-in − Σ cashout)',
      'Player Tilt ID': '',
      Email: '',
      'Phone Number': '',
      'Current wallet balance': Number(walletSum.toFixed(2)),
      'Total buy-in (all types, range)': Number(totalBuyinAll.toFixed(2)),
      'Total cashout (all types, range)': Number(totalCashoutAll.toFixed(2)),
      'Table buy-in (range)': Number(sumTableIn.toFixed(2)),
      'Table buy-out (range)': Number(sumTableOut.toFixed(2)),
      'Club buy-in / deposit (range)': Number(sumClubIn.toFixed(2)),
      'Club cashout / buy-out (range)': Number(sumClubOut.toFixed(2)),
      'Tournament / register buy (range)': Number(sumTourn.toFixed(2)),
      'Rake (player-attributed, range)': Number(totalRakeAll.toFixed(2)),
      'Tips (range)': Number(totalTipsAll.toFixed(2)),
      'Bonus (range)': Number(totalBonusAll.toFixed(2)),
      'Player net (cashout − buy-in, range)': clubRetained,
    });
    const playerSheet: ReportSheet = {
      reportName: 'Cumulative Player Report (Player Summary)',
      headers: [
        'Name',
        'Player Tilt ID',
        'Email',
        'Phone Number',
        'Current wallet balance',
        'Total buy-in (all types, range)',
        'Total cashout (all types, range)',
        'Table buy-in (range)',
        'Table buy-out (range)',
        'Club buy-in / deposit (range)',
        'Club cashout / buy-out (range)',
        'Tournament / register buy (range)',
        'Rake (player-attributed, range)',
        'Tips (range)',
        'Bonus (range)',
        'Player net (cashout − buy-in, range)',
      ],
      rows: playerRows,
    };

    const fnbAgg = await this.fnbOrderRepo.find({
      where: { club: { id: clubId } },
    });
    const fnbInRange = fnbAgg.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });
    const fnbByPlayer: Record<string, number> = {};
    for (const o of fnbInRange) {
      if (!o.playerId) continue;
      fnbByPlayer[o.playerId] = (fnbByPlayer[o.playerId] || 0) + this.num(o.totalAmount);
    }
    const fnbRows = activePlayers
      .filter((p) => (fnbByPlayer[p.id] || 0) > 0)
      .map((p) => ({
        Name: p.name || 'N/A',
        'Player Tilt ID': p.playerId || '',
        'F&B spend (range, not wallet)': Number((fnbByPlayer[p.id] || 0).toFixed(2)),
      }));
    const fnbSheet: ReportSheet = {
      reportName: 'Cumulative — F&B by player (separate from wallet)',
      headers: ['Name', 'Player Tilt ID', 'F&B spend (range, not wallet)'],
      rows: fnbRows,
    };

    return { sections: [dateSheet, playerSheet, fnbSheet] };
  }

  private async generateDailyTransactionsReport(clubId: string, startDate: Date, endDate: Date): Promise<{ sections: ReportSheet[] }> {
    const allTx = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'DESC' },
    });
    const completed = allTx.filter((t) => t.status === TransactionStatus.COMPLETED);

    const byDate: Record<string, { deposit: number; cashout: number; other: number; count: number }> = {};
    const bump = (date: string, key: 'deposit' | 'cashout' | 'other', amt: number) => {
      if (!byDate[date]) byDate[date] = { deposit: 0, cashout: 0, other: 0, count: 0 };
      byDate[date][key] += amt;
      byDate[date].count += 1;
    };
    for (const t of completed) {
      const date = this.formatReportDate(t.createdAt);
      const amt = this.num(t.amount);
      if (this.isBuyInType(t.type)) bump(date, 'deposit', amt);
      else if (this.isCashoutType(t.type)) bump(date, 'cashout', amt);
      else bump(date, 'other', amt);
    }
    const sortedDates = Object.keys(byDate).sort();
    const summaryRows = sortedDates.map((date) => {
      const d = byDate[date];
      return {
        Date: date,
        'Completed tx count': d.count,
        'Buy-in / deposit total': Number(d.deposit.toFixed(2)),
        'Cashout / buy-out total': Number(d.cashout.toFixed(2)),
        'Other movements': Number(d.other.toFixed(2)),
      };
    });
    const summarySheet: ReportSheet = {
      reportName: 'Daily Transactions — Date summary',
      headers: ['Date', 'Completed tx count', 'Buy-in / deposit total', 'Cashout / buy-out total', 'Other movements'],
      rows: summaryRows,
    };

    const tiltMap = await this.tiltIdByPlayerUuid(clubId, allTx.map((t) => t.playerId));
    const detailSheet: ReportSheet = {
      reportName: 'Daily Transactions — Full ledger',
      headers: [
        'Timestamp (IST)',
        'Date',
        'Type',
        'Status',
        'Player name',
        'Player Tilt ID',
        'Amount',
        'Category',
        'Game tag',
        'Notes',
      ],
      rows: allTx.map((t) => ({
        'Timestamp (IST)': this.formatReportDateTime(t.createdAt),
        Date: this.formatReportDate(t.createdAt),
        Type: t.type,
        Status: t.status,
        'Player name': t.playerName,
        'Player Tilt ID': tiltMap.get(t.playerId) ?? '',
        Amount: Number(this.num(t.amount).toFixed(2)),
        Category: this.txnCategory(t.type),
        'Game tag': t.gameType === 'rummy' ? 'Rummy' : t.gameType === 'poker' ? 'Poker' : t.gameType || '—',
        Notes: this.normalizeReportText(t.notes || t.overrideReason || '', 220),
      })),
    };

    const fnbOrders = await this.fnbOrderRepo.find({
      where: { club: { id: clubId } },
      order: { createdAt: 'DESC' },
    });
    const fnbFiltered = fnbOrders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    });
    const fnbTilt = await this.tiltIdByPlayerUuid(
      clubId,
      fnbFiltered.map((o) => o.playerId).filter(Boolean) as string[],
    );
    const fnbSheet: ReportSheet = {
      reportName: 'Daily Transactions — F&B (not wallet)',
      headers: [
        'Timestamp (IST)',
        'Order #',
        'Player',
        'Player Tilt ID',
        'Table',
        'Status',
        'Amount',
        'Items',
      ],
      rows: fnbFiltered.map((o) => ({
        'Timestamp (IST)': this.formatReportDateTime(o.createdAt),
        'Order #': o.orderNumber || o.id,
        Player: o.playerName,
        'Player Tilt ID': (o.playerId && fnbTilt.get(o.playerId)) || '',
        Table: o.tableNumber,
        Status: o.status,
        Amount: Number(this.num(o.totalAmount).toFixed(2)),
        Items: Array.isArray(o.items)
          ? this.normalizeReportText(o.items.map((i) => `${i.name}×${i.quantity}`).join('; '), 220)
          : '',
      })),
    };
    const salaries = await this.salaryPaymentRepo.find({
      where: { club: { id: clubId } },
      relations: ['staff'],
    });
    const tips = await this.dealerTipsRepo.find({
      where: { clubId },
      relations: ['dealer'],
    });
    const dealerCashouts = await this.dealerCashoutRepo.find({
      where: { club: { id: clubId } },
      relations: ['dealer'],
    });
    const managerCashouts = await this.managerCashoutRepo.find({
      where: { club: { id: clubId } },
      relations: ['manager'],
    });
    const staffBonuses = await this.staffBonusRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      relations: ['staff'],
    });

    const staffRows: Record<string, string | number>[] = [];
    for (const s of salaries) {
      if (!this.inRange(s.paymentDate, startDate, endDate)) continue;
      staffRows.push({
        'Timestamp (IST)': this.formatReportDateTime(new Date(s.paymentDate)),
        Date: this.formatReportDate(new Date(s.paymentDate)),
        Type: 'salary_payment',
        Status: s.status || 'Processed',
        'Staff name': s.staff?.name || '',
        Role: s.staff?.role || '',
        Amount: Number(this.num(s.netAmount).toFixed(2)),
        Category: 'Staff payment',
        'Game tag': '',
        Notes: this.normalizeReportText(s.notes || '', 220),
      });
    }
    for (const t of tips) {
      if (!this.inRange(t.tipDate, startDate, endDate)) continue;
      const paidToStaff = Number(t.dealerShareAmount || 0) + Number(t.floorManagerAmount || 0);
      staffRows.push({
        'Timestamp (IST)': this.formatReportDateTime(new Date(t.tipDate)),
        Date: this.formatReportDate(new Date(t.tipDate)),
        Type: 'dealer_tip_distribution',
        Status: t.status || 'Processed',
        'Staff name': t.dealer?.name || '',
        Role: t.dealer?.role || 'Dealer',
        Amount: Number(this.num(paidToStaff).toFixed(2)),
        Category: 'Tips payout',
        'Game tag': '',
        Notes: this.normalizeReportText(t.notes || '', 220),
      });
    }
    for (const c of dealerCashouts) {
      if (!this.inRange(c.cashoutDate, startDate, endDate)) continue;
      staffRows.push({
        'Timestamp (IST)': this.formatReportDateTime(new Date(c.cashoutDate)),
        Date: this.formatReportDate(new Date(c.cashoutDate)),
        Type: 'dealer_cashout',
        Status: 'Completed',
        'Staff name': c.dealer?.name || '',
        Role: c.dealer?.role || 'Dealer',
        Amount: Number(this.num(c.amount).toFixed(2)),
        Category: 'Staff cashout',
        'Game tag': c.gameType || '',
        Notes: this.normalizeReportText(c.notes || '', 220),
      });
    }
    for (const c of managerCashouts) {
      if (!this.inRange(c.cashoutDate, startDate, endDate)) continue;
      staffRows.push({
        'Timestamp (IST)': this.formatReportDateTime(new Date(c.cashoutDate)),
        Date: this.formatReportDate(new Date(c.cashoutDate)),
        Type: 'manager_cashout',
        Status: 'Completed',
        'Staff name': c.manager?.name || '',
        Role: c.manager?.role || 'Manager',
        Amount: Number(this.num(c.amount).toFixed(2)),
        Category: 'Staff cashout',
        'Game tag': c.gameType || '',
        Notes: this.normalizeReportText(c.notes || '', 220),
      });
    }
    for (const b of staffBonuses) {
      if (!this.inRange(b.createdAt, startDate, endDate)) continue;
      staffRows.push({
        'Timestamp (IST)': this.formatReportDateTime(b.createdAt),
        Date: this.formatReportDate(b.createdAt),
        Type: `staff_bonus_${String(b.bonusType || '').toLowerCase()}`,
        Status: 'Completed',
        'Staff name': b.staff?.name || '',
        Role: b.staff?.role || '',
        Amount: Number(this.num(b.bonusAmount).toFixed(2)),
        Category: 'Staff bonus',
        'Game tag': '',
        Notes: this.normalizeReportText(b.reason || '', 220),
      });
    }
    staffRows.sort((a, b) => String(a['Timestamp (IST)']).localeCompare(String(b['Timestamp (IST)'])));
    const staffSheet: ReportSheet = {
      reportName: 'Daily Transactions — Staff activity ledger',
      headers: [
        'Timestamp (IST)',
        'Date',
        'Type',
        'Status',
        'Staff name',
        'Role',
        'Amount',
        'Category',
        'Game tag',
        'Notes',
      ],
      rows:
        staffRows,
    };

    return { sections: [summarySheet, detailSheet, staffSheet, fnbSheet] };
  }

  private async generateDailyRakeReport(
    clubId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ sections: ReportSheet[] }> {
    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(endDate);
    endDay.setHours(23, 59, 59, 999);

    const collections = await this.rakeCollectionRepo.find({
      where: {
        club: { id: clubId },
        sessionDate: Between(startDay, endDay),
      },
      relations: ['table'],
      order: { sessionDate: 'ASC', collectedAt: 'ASC' },
    });

    const detailRows = collections.map((c) => {
      const tbl = c.table;
      const tnum = tbl?.tableNumber ?? c.tableNumber;
      const tname = tbl ? `Table ${tbl.tableNumber} (${tbl.tableType})` : `Table ${c.tableNumber}`;
      return {
        'Session date': this.formatReportDate(new Date(c.sessionDate)),
        'Collected at (IST)': this.formatReportDateTime(new Date(c.collectedAt)),
        'Table #': tnum,
        'Table name / type': tname,
        'Game': this.tableGameLabel(tbl?.tableType ?? null),
        'Rake amount': Number(this.num(c.totalRakeAmount).toFixed(2)),
        'Collected by': c.collectedByName || '',
        Notes: this.normalizeReportText(c.notes || '', 220),
      };
    });

    const detailSheet: ReportSheet = {
      reportName: 'Daily Rake — Line items',
      headers: [
        'Session date',
        'Collected at (IST)',
        'Table #',
        'Table name / type',
        'Game',
        'Rake amount',
        'Collected by',
        'Notes',
      ],
      rows: detailRows,
    };

    const byTable: Record<string, number> = {};
    let grand = 0;
    for (const c of collections) {
      const tbl = c.table;
      const key = tbl ? `T${tbl.tableNumber} (${tbl.tableType})` : `T${c.tableNumber}`;
      const amt = this.num(c.totalRakeAmount);
      byTable[key] = (byTable[key] || 0) + amt;
      grand += amt;
    }
    const byTableRows = Object.entries(byTable)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ 'Table': k, 'Total rake': Number(v.toFixed(2)) }));
    byTableRows.push({ Table: 'TOTAL', 'Total rake': Number(grand.toFixed(2)) });
    const byTableSheet: ReportSheet = {
      reportName: 'Daily Rake — By table',
      headers: ['Table', 'Total rake'],
      rows: byTableRows,
    };

    const byMonth: Record<string, number> = {};
    for (const c of collections) {
      const d = new Date(c.sessionDate);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth[mk] = (byMonth[mk] || 0) + this.num(c.totalRakeAmount);
    }
    const monthRows = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => ({ Month: m, 'Rake total': Number(v.toFixed(2)) }));
    monthRows.push({ Month: 'GRAND (period)', 'Rake total': Number(grand.toFixed(2)) });
    const monthSheet: ReportSheet = {
      reportName: 'Daily Rake — Monthly rollup',
      headers: ['Month', 'Rake total'],
      rows: monthRows,
    };

    return { sections: [detailSheet, byTableSheet, monthSheet] };
  }

  private async generatePerTableTransactionsReport(
    clubId: string,
    tableNumberRaw: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<{ sections: ReportSheet[] }> {
    const tnf = this.parseTableNumberFilter(tableNumberRaw);
    const filterNote =
      tnf != null
        ? `Filtered to table number ${tnf} (parsed from "${tableNumberRaw || ''}")`
        : 'All tables (no filter). Wallet rows below are club-wide TABLE_BUY_IN / TABLE_BUY_OUT / CREDIT (no per-table id on ledger).';

    const metaSheet: ReportSheet = {
      reportName: 'Per Table Report — Scope',
      headers: ['Field', 'Value'],
      rows: [
        { Field: 'Period', Value: `${this.formatReportDate(startDate)} → ${this.formatReportDate(endDate)}` },
        { Field: 'Filter', Value: filterNote },
      ],
    };

    const startDay = new Date(startDate);
    startDay.setHours(0, 0, 0, 0);
    const endDay = new Date(endDate);
    endDay.setHours(23, 59, 59, 999);

    const collections = await this.rakeCollectionRepo.find({
      where: { club: { id: clubId }, sessionDate: Between(startDay, endDay) },
      relations: ['table'],
      order: { sessionDate: 'ASC', collectedAt: 'ASC' },
    });
    const rakeFiltered = collections.filter((c) => tnf == null || c.tableNumber === tnf);
    const rakeSheet: ReportSheet = {
      reportName: 'Per Table — Rake collections',
      headers: [
        'Session date',
        'Collected at (IST)',
        'Table #',
        'Table type',
        'Game',
        'Rake',
        'Collected by',
      ],
      rows: rakeFiltered.map((c) => ({
        'Session date': this.formatReportDate(new Date(c.sessionDate)),
        'Collected at (IST)': this.formatReportDateTime(new Date(c.collectedAt)),
        'Table #': c.tableNumber,
        'Table type': c.table?.tableType ?? '',
        Game: this.tableGameLabel(c.table?.tableType ?? null),
        Rake: Number(this.num(c.totalRakeAmount).toFixed(2)),
        'Collected by': c.collectedByName || '',
      })),
    };

    const buyIns = await this.buyInRequestRepo.find({
      where: { club: { id: clubId } },
      relations: ['player', 'table'],
      order: { requestedAt: 'DESC' },
    });
    const buyFiltered = buyIns.filter((b) => {
      const d = new Date(b.requestedAt);
      if (d < startDate || d > endDate) return false;
      if (tnf != null && b.tableNumber !== tnf) return false;
      return true;
    });
    const tiltBuy = await this.tiltIdByPlayerUuid(
      clubId,
      buyFiltered.map((b) => b.player?.id).filter(Boolean) as string[],
    );
    const buySheet: ReportSheet = {
      reportName: 'Per Table — Buy-in requests',
      headers: [
        'Requested at (IST)',
        'Status',
        'Player',
        'Player Tilt ID',
        'Table #',
        'Table type',
        'Game',
        'Seat',
        'Requested amount',
        'Table balance',
        'Rejection reason',
      ],
      rows: buyFiltered.map((b) => ({
        'Requested at (IST)': this.formatReportDateTime(new Date(b.requestedAt)),
        Status: b.status,
        Player: b.player?.name || '',
        'Player Tilt ID': (b.player?.id && tiltBuy.get(b.player.id)) || '',
        'Table #': b.tableNumber ?? '',
        'Table type': b.table?.tableType || '',
        Game: this.tableGameLabel(b.table?.tableType ?? null),
        Seat: b.seatNumber ?? '',
        'Requested amount': Number(this.num(b.requestedAmount).toFixed(2)),
        'Table balance': b.currentTableBalance != null ? Number(this.num(b.currentTableBalance).toFixed(2)) : '',
        'Rejection reason': this.normalizeReportText(b.rejectionReason || '', 180),
      })),
    };

    const buyOuts = await this.buyOutRequestRepo.find({
      where: { club: { id: clubId } },
      relations: ['player', 'table'],
      order: { requestedAt: 'DESC' },
    });
    const buyOutFiltered = buyOuts.filter((b) => {
      if (!this.inRange(b.requestedAt, startDate, endDate)) return false;
      if (tnf != null && b.tableNumber !== tnf) return false;
      return true;
    });
    const tiltBuyOut = await this.tiltIdByPlayerUuid(
      clubId,
      buyOutFiltered.map((b) => b.player?.id).filter(Boolean) as string[],
    );
    const buyOutSheet: ReportSheet = {
      reportName: 'Per Table — Buy-out requests',
      headers: [
        'Requested at (IST)',
        'Status',
        'Player',
        'Player Tilt ID',
        'Table #',
        'Table type',
        'Game',
        'Seat',
        'Requested amount',
        'Table balance',
        'Call started at (IST)',
        'Processed at (IST)',
        'Rejection reason',
      ],
      rows: buyOutFiltered.map((b) => ({
        'Requested at (IST)': this.formatReportDateTime(new Date(b.requestedAt)),
        Status: b.status,
        Player: b.player?.name || '',
        'Player Tilt ID': (b.player?.id && tiltBuyOut.get(b.player.id)) || '',
        'Table #': b.tableNumber ?? '',
        'Table type': b.table?.tableType || '',
        Game: this.tableGameLabel(b.table?.tableType ?? null),
        Seat: b.seatNumber ?? '',
        'Requested amount': b.requestedAmount != null ? Number(this.num(b.requestedAmount).toFixed(2)) : '',
        'Table balance': b.currentTableBalance != null ? Number(this.num(b.currentTableBalance).toFixed(2)) : '',
        'Call started at (IST)': b.callTimeStartedAt ? this.formatReportDateTime(new Date(b.callTimeStartedAt)) : '',
        'Processed at (IST)': b.processedAt ? this.formatReportDateTime(new Date(b.processedAt)) : '',
        'Rejection reason': this.normalizeReportText(b.rejectionReason || '', 180),
      })),
    };

    const tx = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });
    const tableRelated = tx.filter((t) =>
      [
        TransactionType.TABLE_BUY_IN,
        TransactionType.TABLE_BUY_OUT,
        TransactionType.CREDIT,
        TransactionType.DEBIT,
        TransactionType.TIP,
        TransactionType.RAKE,
      ].includes(t.type as TransactionType),
    );
    const tiltTx = await this.tiltIdByPlayerUuid(clubId, tableRelated.map((t) => t.playerId));
    const ledgerSheet: ReportSheet = {
      reportName: 'Per Table — Table/credit ledger (club-wide; see scope note)',
      headers: ['Timestamp (IST)', 'Type', 'Status', 'Player', 'Tilt ID', 'Amount', 'Game', 'Notes'],
      rows: tableRelated.map((t) => ({
        'Timestamp (IST)': this.formatReportDateTime(t.createdAt),
        Type: t.type,
        Status: t.status,
        Player: t.playerName,
        'Tilt ID': tiltTx.get(t.playerId) ?? '',
        Amount: Number(this.num(t.amount).toFixed(2)),
        Game: t.gameType === 'rummy' ? 'Rummy' : t.gameType === 'poker' ? 'Poker' : t.gameType || '',
        Notes: this.normalizeReportText(t.notes || '', 220),
      })),
    };

    const fnb = await this.fnbOrderRepo.find({ where: { club: { id: clubId } } });
    const fnbF = fnb.filter((o) => {
      const d = new Date(o.createdAt);
      if (d < startDate || d > endDate) return false;
      if (tnf == null) return true;
      return String(o.tableNumber).replace(/\D/g, '') === String(tnf) || String(o.tableNumber) === String(tnf);
    });
    const fnbTilt = await this.tiltIdByPlayerUuid(
      clubId,
      fnbF.map((o) => o.playerId).filter(Boolean) as string[],
    );
    const fnbSheet: ReportSheet = {
      reportName: 'Per Table — F&B (not wallet)',
      headers: ['Timestamp (IST)', 'Order #', 'Player', 'Tilt ID', 'Table', 'Amount', 'Status'],
      rows: fnbF.map((o) => ({
        'Timestamp (IST)': this.formatReportDateTime(o.createdAt),
        'Order #': o.orderNumber || o.id,
        Player: o.playerName,
        'Tilt ID': (o.playerId && fnbTilt.get(o.playerId)) || '',
        Table: o.tableNumber,
        Amount: Number(this.num(o.totalAmount).toFixed(2)),
        Status: o.status,
      })),
    };

    return { sections: [metaSheet, rakeSheet, buySheet, buyOutSheet, ledgerSheet, fnbSheet] };
  }

  private creditStatusToTemplate(status: CreditRequestStatus): string {
    if (status === CreditRequestStatus.APPROVED) return 'Success';
    if (status === CreditRequestStatus.PENDING) return 'Pending';
    if (status === CreditRequestStatus.DENIED) return 'Rejected';
    return 'Failed';
  }

  private async generateCreditTransactionsReport(
    clubId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ sections: ReportSheet[] }> {
    const creditRequests = await this.creditRequestRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'DESC' },
    });
    const tiltMap = await this.tiltIdByPlayerUuid(clubId, creditRequests.map((c) => c.playerId));
    const requestsSheet: ReportSheet = {
      reportName: 'Credit — Requests (audit)',
      headers: [
        'Created (IST)',
        'Updated (IST)',
        'Player',
        'Tilt ID',
        'Amount',
        'Status',
        'Request notes',
        'Rejection reason',
        'Limit on request',
      ],
      rows: creditRequests.map((c) => ({
        'Created (IST)': this.formatReportDateTime(c.createdAt),
        'Updated (IST)': this.formatReportDateTime(c.updatedAt),
        Player: c.playerName || '',
        'Tilt ID': tiltMap.get(c.playerId) ?? '',
        Amount: Number(this.num(c.amount).toFixed(2)),
        Status: this.creditStatusToTemplate(c.status as CreditRequestStatus),
        'Request notes': this.normalizeReportText(c.notes || '', 220),
        'Rejection reason': this.normalizeReportText(c.rejectionReason || '', 220),
        'Limit on request': Number(this.num(c.limit).toFixed(2)),
      })),
    };

    const creditTx = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });
    const crLines = creditTx.filter(
      (t) =>
        t.type === TransactionType.CREDIT ||
        t.type === TransactionType.DEBIT,
    );
    const tiltLines = await this.tiltIdByPlayerUuid(clubId, crLines.map((t) => t.playerId));
    const ledgerSheet: ReportSheet = {
      reportName: 'Credit — Ledger (Credit / Debit tx)',
      headers: ['Timestamp (IST)', 'Type', 'Status', 'Player', 'Tilt ID', 'Amount', 'Notes'],
      rows: crLines.map((t) => ({
        'Timestamp (IST)': this.formatReportDateTime(t.createdAt),
        Type: t.type,
        Status: t.status,
        Player: t.playerName,
        'Tilt ID': tiltLines.get(t.playerId) ?? '',
        Amount: Number(this.num(t.amount).toFixed(2)),
        Notes: this.normalizeReportText(t.notes || '', 220),
      })),
    };

    const players = await this.playerRepo.find({ where: { club: { id: clubId } } });
    const requestPlayerIds = new Set(creditRequests.map((r) => r.playerId));
    const outstandingMap = await this.creditOutstandingMap(clubId);
    const summaryRows: Record<string, string | number>[] = [];
    for (const p of players) {
      const outstanding = outstandingMap.get(p.id) ?? 0;
      if (!p.creditEnabled && outstanding === 0 && !requestPlayerIds.has(p.id)) {
        continue;
      }
      const limitLabel = p.creditEnabled ? Number(this.num(p.creditLimit).toFixed(2)) : 'Credit locked';
      summaryRows.push({
        Player: p.name || '',
        'Tilt ID': p.playerId || '',
        'Credit enabled': p.creditEnabled ? 'Yes' : 'No',
        'Credit limit / locked': limitLabel,
        'Outstanding credit (Credit−Debit, all time)': Number(outstanding.toFixed(2)),
      });
    }
    const summarySheet: ReportSheet = {
      reportName: 'Credit — Player limits & outstanding',
      headers: ['Player', 'Tilt ID', 'Credit enabled', 'Credit limit / locked', 'Outstanding credit (Credit−Debit, all time)'],
      rows: summaryRows,
    };

    return { sections: [requestsSheet, ledgerSheet, summarySheet] };
  }

  private async generateExpensesReport(
    clubId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ sections: ReportSheet[] }> {
    const salaries = await this.salaryPaymentRepo.find({
      where: { club: { id: clubId } },
      relations: ['staff'],
    });
    const tips = await this.dealerTipsRepo.find({
      where: { clubId },
      relations: ['dealer'],
    });
    const cashouts = await this.dealerCashoutRepo.find({
      where: { club: { id: clubId } },
      relations: ['dealer'],
    });
    const staffBonuses = await this.staffBonusRepo.find({
      where: { club: { id: clubId } },
      relations: ['staff'],
    });
    const managerCashouts = await this.managerCashoutRepo.find({
      where: { club: { id: clubId } },
      relations: ['manager'],
    });

    const byDate: Record<string, { bonus: number; salaries: number; tips: number; cashout: number; managerCashout: number }> = {};
    const add = (dateStr: string, key: 'bonus' | 'salaries' | 'tips' | 'cashout' | 'managerCashout', value: number) => {
      if (!byDate[dateStr]) byDate[dateStr] = { bonus: 0, salaries: 0, tips: 0, cashout: 0, managerCashout: 0 };
      byDate[dateStr][key] += value;
    };
    salaries
      .filter((s) => s.paymentDate && new Date(s.paymentDate) >= startDate && new Date(s.paymentDate) <= endDate)
      .forEach((s) => {
        add(this.formatReportDate(new Date(s.paymentDate)), 'salaries', parseFloat(s.netAmount.toString()));
      });
    tips
      .filter((t) => t.tipDate && new Date(t.tipDate) >= startDate && new Date(t.tipDate) <= endDate)
      .forEach((t) => {
        const paidToDealer = Number(t.dealerShareAmount || 0) + Number(t.floorManagerAmount || 0);
        add(this.formatReportDate(new Date(t.tipDate)), 'tips', paidToDealer);
      });
    cashouts
      .filter((c) => c.cashoutDate && new Date(c.cashoutDate) >= startDate && new Date(c.cashoutDate) <= endDate)
      .forEach((c) => {
        add(this.formatReportDate(new Date(c.cashoutDate)), 'cashout', parseFloat(c.amount.toString()));
      });
    staffBonuses
      .filter((b) => b.createdAt && new Date(b.createdAt) >= startDate && new Date(b.createdAt) <= endDate)
      .forEach((b) => {
        add(this.formatReportDate(b.createdAt), 'bonus', parseFloat(b.bonusAmount.toString()));
      });
    managerCashouts
      .filter((c) => c.cashoutDate && new Date(c.cashoutDate) >= startDate && new Date(c.cashoutDate) <= endDate)
      .forEach((c) => {
        add(this.formatReportDate(new Date(c.cashoutDate)), 'managerCashout', parseFloat(c.amount.toString()));
      });

    const sortedDates = Object.keys(byDate).sort();
    const rollupRows = sortedDates.map((date) => {
      const d = byDate[date];
      const totalExpense = d.bonus + d.salaries + d.tips + d.cashout + d.managerCashout;
      return {
        Date: date,
        'Staff bonuses': Number(d.bonus.toFixed(2)),
        Salaries: Number(d.salaries.toFixed(2)),
        'Dealer tips (share)': Number(d.tips.toFixed(2)),
        'Dealer/staff cashouts': Number(d.cashout.toFixed(2)),
        'Manager cashouts': Number(d.managerCashout.toFixed(2)),
        'Ops subtotal': Number(totalExpense.toFixed(2)),
      };
    });
    const rollupSheet: ReportSheet = {
      reportName: 'Expenses — Ops rollup by day',
      headers: ['Date', 'Staff bonuses', 'Salaries', 'Dealer tips (share)', 'Dealer/staff cashouts', 'Manager cashouts', 'Ops subtotal'],
      rows: rollupRows,
    };

    const lineRows: Record<string, string | number>[] = [];
    salaries
      .filter((s) => s.paymentDate && new Date(s.paymentDate) >= startDate && new Date(s.paymentDate) <= endDate)
      .forEach((s) => {
        lineRows.push({
          'Timestamp (IST)': this.formatReportDateTime(new Date(s.paymentDate)),
          Category: 'Salary',
          Recipient: s.staff?.name || '',
          Amount: Number(this.num(s.netAmount).toFixed(2)),
          Notes: s.notes || '',
        });
      });
    tips
      .filter((t) => t.tipDate && new Date(t.tipDate) >= startDate && new Date(t.tipDate) <= endDate)
      .forEach((t) => {
        const amt = Number(t.dealerShareAmount || 0) + Number(t.floorManagerAmount || 0);
        lineRows.push({
          'Timestamp (IST)': this.formatReportDateTime(new Date(t.tipDate)),
          Category: 'Dealer tips',
          Recipient: t.dealer?.name || '',
          Amount: Number(amt.toFixed(2)),
          Notes: '',
        });
      });
    cashouts
      .filter((c) => c.cashoutDate && new Date(c.cashoutDate) >= startDate && new Date(c.cashoutDate) <= endDate)
      .forEach((c) => {
        lineRows.push({
          'Timestamp (IST)': this.formatReportDateTime(new Date(c.cashoutDate)),
          Category: 'Dealer cashout',
          Recipient: c.dealer?.name || '',
          Amount: Number(this.num(c.amount).toFixed(2)),
          Notes: c.notes || '',
        });
      });
    staffBonuses
      .filter((b) => b.createdAt && new Date(b.createdAt) >= startDate && new Date(b.createdAt) <= endDate)
      .forEach((b) => {
        lineRows.push({
          'Timestamp (IST)': this.formatReportDateTime(b.createdAt),
          Category: `Staff bonus (${b.bonusType})`,
          Recipient: b.staff?.name || '',
          Amount: Number(this.num(b.bonusAmount).toFixed(2)),
          Notes: this.normalizeReportText(b.reason || '', 220),
        });
      });
    managerCashouts
      .filter((c) => c.cashoutDate && new Date(c.cashoutDate) >= startDate && new Date(c.cashoutDate) <= endDate)
      .forEach((c) => {
        lineRows.push({
          'Timestamp (IST)': this.formatReportDateTime(new Date(c.cashoutDate)),
          Category: 'Manager cashout',
          Recipient: c.manager?.name || '',
          Amount: Number(this.num(c.amount).toFixed(2)),
          Notes: c.notes || '',
        });
      });
    lineRows.sort((a, b) =>
      String(a['Timestamp (IST)']).localeCompare(String(b['Timestamp (IST)'])),
    );
    const lineSheet: ReportSheet = {
      reportName: 'Expenses — Ops line items',
      headers: ['Timestamp (IST)', 'Category', 'Recipient', 'Amount', 'Notes'],
      rows: lineRows,
    };

    const payoutTypes = [
      TransactionType.TOURNAMENT_WIN,
      TransactionType.CASHOUT,
      TransactionType.WITHDRAWAL,
      TransactionType.CLUB_BUY_OUT,
      TransactionType.TABLE_BUY_OUT,
      TransactionType.REFUND,
    ];
    const playerPayoutTx = await this.transactionRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate), status: TransactionStatus.COMPLETED },
      order: { createdAt: 'ASC' },
    });
    const payouts = playerPayoutTx.filter((t) => payoutTypes.includes(t.type as TransactionType));
    const tiltP = await this.tiltIdByPlayerUuid(clubId, payouts.map((t) => t.playerId));
    const payoutSheet: ReportSheet = {
      reportName: 'Expenses — Player payouts (money leaving club)',
      headers: ['Timestamp (IST)', 'Type', 'Player', 'Tilt ID', 'Amount', 'Notes'],
      rows: payouts.map((t) => ({
        'Timestamp (IST)': this.formatReportDateTime(t.createdAt),
        Type: t.type,
        Player: t.playerName,
        'Tilt ID': tiltP.get(t.playerId) ?? '',
        Amount: Number(this.num(t.amount).toFixed(2)),
        Notes: this.normalizeReportText(t.notes || '', 220),
      })),
    };

    const inventory = await this.inventoryRepo.find({ where: { club: { id: clubId } } });
    const invRows = inventory
      .filter(
        (i) =>
          i.lastRestocked &&
          new Date(i.lastRestocked) >= startDate &&
          new Date(i.lastRestocked) <= endDate,
      )
      .map((i) => ({
        'Last restocked': this.formatReportDate(new Date(i.lastRestocked!)),
        Item: i.name,
        Category: i.category,
        'Unit cost (reference)': i.cost != null ? Number(this.num(i.cost).toFixed(2)) : '',
        Supplier: i.supplier || '',
        'Current stock': Number(this.num(i.currentStock).toFixed(2)),
        Unit: i.unit || '',
      }));
    const invSheet: ReportSheet = {
      reportName: 'Expenses — Inventory last restocked in period (reference)',
      headers: [
        'Last restocked',
        'Item',
        'Category',
        'Unit cost (reference)',
        'Supplier',
        'Current stock',
        'Unit',
      ],
      rows:
        invRows.length > 0
          ? invRows
          : [
              {
                'Last restocked': '—',
                Item: 'No inventory restock dates in range',
                Category: '',
                'Unit cost (reference)': '',
                Supplier: '',
                'Current stock': '',
                Unit: '',
              },
            ],
    };

    return { sections: [rollupSheet, lineSheet, payoutSheet, invSheet] };
  }

  private async generateBonusReport(clubId: string, startDate: Date, endDate: Date): Promise<ReportSheet> {
    const playerBonuses = await this.playerBonusRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      relations: ['player'],
    });
    const staffBonuses = await this.staffBonusRepo.find({
      where: { club: { id: clubId }, createdAt: Between(startDate, endDate) },
      relations: ['staff'],
    });
    const playerRows = playerBonuses.map((b) => ({
      'Timestamp (IST)': this.formatReportDateTime(b.createdAt),
      'Bonus type': b.bonusType,
      Name: (b as { player?: { name: string; playerId?: string | null } }).player?.name ?? 'N/A',
      'Player Tilt ID': (b as { player?: { playerId?: string | null } }).player?.playerId ?? '',
      'Player/Staff': 'Player',
      Amount: Number(this.num(b.bonusAmount).toFixed(2)),
      Reason: this.normalizeReportText(b.reason || '', 220),
      'Processed at (IST)': this.formatReportDateTime(b.processedAt),
    }));
    const staffRows = staffBonuses.map((b) => ({
      'Timestamp (IST)': this.formatReportDateTime(b.createdAt),
      'Bonus type': b.bonusType,
      Name: (b as { staff?: { name: string } }).staff?.name ?? 'N/A',
      'Player Tilt ID': '',
      'Player/Staff': 'Staff',
      Amount: Number(this.num(b.bonusAmount).toFixed(2)),
      Reason: this.normalizeReportText(b.reason || '', 220),
      'Processed at (IST)': this.formatReportDateTime(b.processedAt),
    }));
    const rows = [...playerRows, ...staffRows].sort((a, b) =>
      String(a['Timestamp (IST)']).localeCompare(String(b['Timestamp (IST)'])),
    );
    return {
      reportName: 'Bonus Report',
      headers: [
        'Timestamp (IST)',
        'Bonus type',
        'Name',
        'Player Tilt ID',
        'Player/Staff',
        'Amount',
        'Reason',
        'Processed at (IST)',
      ],
      rows,
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
        case ReportType.DAILY_TRANSACTIONS: {
          const daily = await this.generateDailyTransactionsReport(clubId, startDate, endDate);
          sheetOrSections = daily;
          break;
        }
        case ReportType.DAILY_RAKE:
          sheetOrSections = await this.generateDailyRakeReport(clubId, startDate, endDate);
          break;
        case ReportType.PER_TABLE_TRANSACTIONS: {
          sheetOrSections = await this.generatePerTableTransactionsReport(clubId, undefined, startDate, endDate);
          break;
        }
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

  private addSheetToWorkbook(
    workbook: ExcelJS.Workbook,
    sheet: ReportSheet,
    clubName: string,
    periodLabel?: string,
  ): void {
    const safeName = sheet.reportName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31);
    const worksheet = workbook.addWorksheet(safeName, { properties: { tabColor: { argb: 'FF4F81BD' } } });
    let rowNum = 1;
    const colCount = Math.max(2, sheet.headers.length);
    worksheet.mergeCells(rowNum, 1, rowNum, colCount);
    worksheet.getCell(rowNum, 1).value = sheet.reportName;
    worksheet.getCell(rowNum, 1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
    worksheet.getCell(rowNum, 1).alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getCell(rowNum, 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    worksheet.getRow(rowNum).height = 24;
    rowNum += 1;
    worksheet.getCell(rowNum, 1).value = 'Club';
    worksheet.getCell(rowNum, 1).font = { bold: true };
    worksheet.getCell(rowNum, 2).value = clubName;
    rowNum += 1;
    if (periodLabel) {
      worksheet.getCell(rowNum, 1).value = 'Period';
      worksheet.getCell(rowNum, 1).font = { bold: true };
      worksheet.getCell(rowNum, 2).value = periodLabel;
      rowNum += 1;
    }
    worksheet.getCell(rowNum, 1).value = 'Generated At (IST)';
    worksheet.getCell(rowNum, 1).font = { bold: true };
    worksheet.getCell(rowNum, 2).value = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    rowNum += 2;
    const headerRowNum = rowNum;
    sheet.headers.forEach((h, i) => {
      worksheet.getCell(rowNum, i + 1).value = h;
      worksheet.getCell(rowNum, i + 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getCell(rowNum, i + 1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2F75B5' },
      };
      worksheet.getCell(rowNum, i + 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      worksheet.getCell(rowNum, i + 1).border = {
        top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
        right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      };
    });
    rowNum += 1;
    const firstDataRowNum = rowNum;
    sheet.rows.forEach(r => {
      sheet.headers.forEach((h, i) => {
        const v = r[h];
        const cell = worksheet.getCell(rowNum, i + 1);
        cell.value = v !== undefined && v !== null && v !== '' ? v : '';
        cell.alignment = { vertical: 'top', wrapText: true };
        if (typeof v === 'number') cell.numFmt = '#,##0.00';
        if ((rowNum - firstDataRowNum) % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7FBFF' } };
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE6E6E6' } },
          left: { style: 'thin', color: { argb: 'FFE6E6E6' } },
          bottom: { style: 'thin', color: { argb: 'FFE6E6E6' } },
          right: { style: 'thin', color: { argb: 'FFE6E6E6' } },
        };
      });
      rowNum += 1;
    });
    worksheet.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to: { row: headerRowNum, column: Math.max(1, sheet.headers.length) },
    };
    worksheet.views = [{ state: 'frozen', ySplit: headerRowNum }];
    worksheet.columns.forEach((col) => {
      let maxLen = 14;
      col.eachCell?.({ includeEmpty: true }, (cell: any) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen) maxLen = len;
      });
      col.width = Math.min(maxLen + 2, 44);
    });
  }

  private async generateExcel(
    data: ReportSheet | { sections: ReportSheet[] },
    reportType: ReportType,
    clubName: string,
    periodLabel?: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = clubName;
    workbook.created = new Date();

    if ('sections' in data && Array.isArray(data.sections)) {
      data.sections.forEach((sheet) => this.addSheetToWorkbook(workbook, sheet, clubName, periodLabel));
    } else {
      this.addSheetToWorkbook(workbook, data as ReportSheet, clubName, periodLabel);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private writeSheetToPDF(doc: PDFKit.PDFDocument, sheet: ReportSheet, clubName: string): void {
    const margin = 50;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - 2 * margin;
    const fontSize = 8;
    const cellPad = 3;
    const lineGap = 1;
    const numCols = Math.max(1, sheet.headers.length);
    const gridColor = '#9AA7B4';
    const gridWidth = 0.25;
    const bottomY = pageHeight - margin;
    /** Wider columns for long text so wrapping uses fewer lines. */
    const wideHeader = (h: string) =>
      /notes|items|reason|rejection|summary|description|message|metadata|value|field/i.test(String(h));

    const isNumber = (v: string | number): boolean => typeof v === 'number' && !isNaN(v);
    const cellStr = (v: string | number | undefined | null): string => {
      if (v === undefined || v === null || v === '') return '';
      return isNumber(v)
        ? Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(v);
    };
    const PDF_CELL_MAX = 650;
    const forPdfCell = (s: string) =>
      s.length > PDF_CELL_MAX ? `${s.slice(0, PDF_CELL_MAX)}…` : s;

    const weights = sheet.headers.map((h) => {
      const k = String(h).toLowerCase();
      if (k.includes('timestamp')) return 1.25;
      if (k.includes('amount')) return 0.95;
      if (k.includes('notes') || k.includes('summary') || k.includes('reason')) return 1.85;
      return wideHeader(String(h)) ? 1.6 : 1;
    });
    const wSum = weights.reduce((a, b) => a + b, 0);
    const colWidths = weights.map((w) => (w / wSum) * contentWidth);
    const colX = (idx: number) => {
      let x = margin;
      for (let k = 0; k < idx; k++) x += colWidths[k];
      return x;
    };

    const drawTitle = (suffix: string) => {
      const barH = 24;
      const y = doc.y;
      doc.save();
      doc.rect(margin, y, contentWidth, barH).fill('#1F4E78');
      doc.restore();
      doc.fillColor('white')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(`${sheet.reportName}${suffix}`, margin + 8, y + 6, { width: contentWidth - 16 });
      doc.fillColor('#2E3A46')
        .fontSize(fontSize)
        .font('Helvetica')
        .text(clubName, margin, y + barH + 6);
      doc.y = y + barH + 16;
    };

    const headerCellHeight = (colIdx: number, label: string): number => {
      doc.font('Helvetica-Bold').fontSize(fontSize);
      const cw = colWidths[colIdx] - cellPad * 2;
      const h = doc.heightOfString(String(label || ' '), {
        width: Math.max(20, cw),
        lineGap,
      });
      return h + cellPad * 2;
    };

    const dataCellHeight = (colIdx: number, text: string): number => {
      doc.font('Helvetica').fontSize(fontSize);
      const cw = colWidths[colIdx] - cellPad * 2;
      const h = doc.heightOfString(forPdfCell(text || ' '), {
        width: Math.max(20, cw),
        lineGap,
      });
      return h + cellPad * 2;
    };

    const measureHeaderRowHeight = (): number => {
      let maxH = fontSize + cellPad * 2;
      sheet.headers.forEach((h, idx) => {
        maxH = Math.max(maxH, headerCellHeight(idx, String(h)));
      });
      return maxH;
    };

    const measureDataRowHeight = (row: Record<string, string | number>): number => {
      let maxH = fontSize + cellPad * 2;
      sheet.headers.forEach((h, idx) => {
        maxH = Math.max(maxH, dataCellHeight(idx, cellStr(row[h])));
      });
      return maxH;
    };

    const drawHeaderRow = (y0: number): number => {
      const headerH = measureHeaderRowHeight();
      doc.save();
      doc.rect(margin, y0, contentWidth, headerH).fill('#2F75B5');
      doc.restore();
      doc.strokeColor(gridColor).lineWidth(gridWidth);
      for (let c = 0; c <= numCols; c++) {
        const x = colX(c);
        doc.moveTo(x, y0).lineTo(x, y0 + headerH).stroke();
      }
      doc.moveTo(margin, y0).lineTo(margin + contentWidth, y0).stroke();
      doc.moveTo(margin, y0 + headerH).lineTo(margin + contentWidth, y0 + headerH).stroke();
      doc.fillColor('white').font('Helvetica-Bold').fontSize(fontSize);
      sheet.headers.forEach((h, idx) => {
        const x = colX(idx) + cellPad;
        const cw = colWidths[idx] - cellPad * 2;
        doc.text(String(h), x, y0 + cellPad, {
          width: Math.max(20, cw),
          lineGap,
        });
      });
      return y0 + headerH;
    };

    const drawDataRow = (y0: number, row: Record<string, string | number>, rowH: number, rowIdx: number) => {
      if (rowIdx % 2 === 1) {
        doc.save();
        doc.rect(margin, y0, contentWidth, rowH).fill('#F5F9FC');
        doc.restore();
      }
      doc.strokeColor(gridColor).lineWidth(gridWidth);
      for (let c = 0; c <= numCols; c++) {
        const x = colX(c);
        doc.moveTo(x, y0).lineTo(x, y0 + rowH).stroke();
      }
      doc.moveTo(margin, y0).lineTo(margin + contentWidth, y0).stroke();
      doc.moveTo(margin, y0 + rowH).lineTo(margin + contentWidth, y0 + rowH).stroke();
      doc.fillColor('#1D232A').font('Helvetica').fontSize(fontSize);
      sheet.headers.forEach((h, idx) => {
        const x = colX(idx) + cellPad;
        const cw = colWidths[idx] - cellPad * 2;
        doc.text(forPdfCell(cellStr(row[h])), x, y0 + cellPad, {
          width: Math.max(20, cw),
          lineGap,
        });
      });
    };

    if (sheet.headers.length === 0) {
      drawTitle('');
      doc.text('(No columns)', margin, doc.y);
      doc.y += 20;
      return;
    }

    const emptyRowH = fontSize + cellPad * 2;
    let i = 0;
    let part = 0;
    while (i < sheet.rows.length || (sheet.rows.length === 0 && part === 0)) {
      const suffix = part > 0 ? ` (cont. ${part + 1})` : '';
      if (part > 0) {
        doc.addPage();
        doc.y = margin;
      }
      drawTitle(suffix);
      let y = doc.y + 4;
      const headerH = measureHeaderRowHeight();
      if (y + headerH > bottomY) {
        doc.addPage();
        doc.y = margin;
        drawTitle(`${suffix} (header)`);
        y = doc.y + 4;
      }
      y = drawHeaderRow(y);
      if (sheet.rows.length === 0) {
        doc.font('Helvetica').fontSize(fontSize).text('(No data rows)', margin + cellPad, y + cellPad);
        y += emptyRowH;
        doc.y = y + 10;
        break;
      }
      while (i < sheet.rows.length) {
        const naturalH = measureDataRowHeight(sheet.rows[i]);
        const room = bottomY - y - 4;
        if (naturalH <= room) {
          drawDataRow(y, sheet.rows[i], naturalH, i);
          y += naturalH;
          i += 1;
          continue;
        }
        if (room > fontSize + cellPad * 3) {
          doc.save();
          doc.rect(margin, y, contentWidth, room).clip();
          drawDataRow(y, sheet.rows[i], room, i);
          doc.restore();
          y += room;
          i += 1;
        }
        break;
      }
      doc.y = y + 10;
      part += 1;
      if (i >= sheet.rows.length) break;
    }
  }

  private async generatePDF(
    data: ReportSheet | { sections: ReportSheet[] },
    _reportType: ReportType,
    clubName: string,
    periodLabel?: string,
  ): Promise<Buffer> {
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
          doc.fontSize(8).fillColor('#666666').text(`Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} IST`, 50, 50, { align: 'right', width: 495 });
          if (periodLabel) {
            doc.fillColor('#666666').text(`Period: ${periodLabel}`, 50, 62, { width: 400 });
            doc.y = 76;
          } else {
            doc.y = 62;
          }
          doc.fillColor('black');
        }
        this.writeSheetToPDF(doc, sheet, clubName);
      });

      doc.end();
    });
  }
}

