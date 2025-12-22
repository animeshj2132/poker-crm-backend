import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Club } from '../club.entity';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { CreditRequest, CreditRequestStatus } from '../entities/credit-request.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../entities/financial-transaction.entity';
import { WaitlistEntry, WaitlistStatus } from '../entities/waitlist-entry.entity';
import { Table, TableStatus } from '../entities/table.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(CreditRequest) private readonly creditRequestsRepo: Repository<CreditRequest>,
    @InjectRepository(FinancialTransaction) private readonly transactionsRepo: Repository<FinancialTransaction>,
    @InjectRepository(WaitlistEntry) private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table) private readonly tableRepo: Repository<Table>
  ) {}

  async getRevenueAnalytics(clubId: string, startDate?: Date, endDate?: Date) {
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const where: any = { club: { id: clubId } };
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(endDate);
    }

    const transactions = await this.transactionsRepo.find({ where });

    const totalRevenue = transactions
      .filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalWithdrawals = transactions
      .filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalRake = transactions
      .filter(t => t.type === TransactionType.RAKE && t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalTips = transactions
      .filter(t => t.type === TransactionType.TIP && t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const pendingTransactions = transactions.filter(t => t.status === TransactionStatus.PENDING).length;
    const failedTransactions = transactions.filter(t => t.status === TransactionStatus.FAILED).length;

    return {
      clubId,
      period: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null
      },
      revenue: {
        totalRevenue,
        totalWithdrawals,
        netRevenue: totalRevenue - totalWithdrawals,
        totalRake,
        totalTips,
        tipHoldPercent: 0.15, // Default, can be from settings
        clubTipShare: totalTips * 0.15,
        staffTipShare: totalTips * 0.85
      },
      transactions: {
        total: transactions.length,
        completed: transactions.filter(t => t.status === TransactionStatus.COMPLETED).length,
        pending: pendingTransactions,
        failed: failedTransactions
      }
    };
  }

  async getPlayerAnalytics(clubId: string, startDate?: Date, endDate?: Date) {
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const where: any = { club: { id: clubId } };
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(endDate);
    }

    const transactions = await this.transactionsRepo.find({ where });
    const waitlistEntries = await this.waitlistRepo.find({ where });

    // Get unique players from transactions
    const playerIds = new Set<string>();
    transactions.forEach(t => {
      if (t.playerId) playerIds.add(t.playerId);
    });

    const totalPlayers = playerIds.size;
    const activePlayers = transactions
      .filter(t => t.status === TransactionStatus.COMPLETED)
      .map(t => t.playerId)
      .filter((id): id is string => !!id);
    const uniqueActivePlayers = new Set(activePlayers).size;

    const totalDeposits = transactions
      .filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalWithdrawals = transactions
      .filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.COMPLETED)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const averageDeposit = totalPlayers > 0 ? totalDeposits / totalPlayers : 0;
    const averageWithdrawal = totalPlayers > 0 ? totalWithdrawals / totalPlayers : 0;

    return {
      clubId,
      period: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null
      },
      players: {
        total: totalPlayers,
        active: uniqueActivePlayers,
        new: waitlistEntries.filter(e => e.status === WaitlistStatus.PENDING).length
      },
      financial: {
        totalDeposits,
        totalWithdrawals,
        averageDeposit,
        averageWithdrawal,
        netPlayerActivity: totalDeposits - totalWithdrawals
      }
    };
  }

  async getStaffAnalytics(clubId: string) {
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const staff = await this.staffRepo.find({
      where: { club: { id: clubId } }
    });

    const totalStaff = staff.length;
    const activeStaff = staff.filter(s => s.status === StaffStatus.ACTIVE).length;
    const inactiveStaff = staff.filter(s => s.status === StaffStatus.DEACTIVATED).length;

    // Group by role
    const byRole: Record<string, number> = {};
    staff.forEach(s => {
      byRole[s.role] = (byRole[s.role] || 0) + 1;
    });

    return {
      clubId,
      staff: {
        total: totalStaff,
        active: activeStaff,
        inactive: inactiveStaff,
        byRole
      }
    };
  }

  async getTableAnalytics(clubId: string) {
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const tables = await this.tableRepo.find({
      where: { club: { id: clubId } }
    });

    const totalTables = tables.length;
    const availableTables = tables.filter(t => t.status === TableStatus.AVAILABLE).length;
    const occupiedTables = tables.filter(t => t.status === TableStatus.OCCUPIED).length;
    const reservedTables = tables.filter(t => t.status === TableStatus.RESERVED).length;
    const maintenanceTables = tables.filter(t => t.status === TableStatus.MAINTENANCE).length;

    const totalSeats = tables.reduce((sum, t) => sum + t.maxSeats, 0);
    const occupiedSeats = tables.reduce((sum, t) => sum + t.currentSeats, 0);
    const availableSeats = totalSeats - occupiedSeats;
    const occupancyRate = totalSeats > 0 ? (occupiedSeats / totalSeats) * 100 : 0;

    return {
      clubId,
      tables: {
        total: totalTables,
        available: availableTables,
        occupied: occupiedTables,
        reserved: reservedTables,
        maintenance: maintenanceTables
      },
      seats: {
        total: totalSeats,
        occupied: occupiedSeats,
        available: availableSeats,
        occupancyRate: Math.round(occupancyRate * 100) / 100
      }
    };
  }

  async getWaitlistAnalytics(clubId: string, startDate?: Date, endDate?: Date) {
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const where: any = { club: { id: clubId } };
    if (startDate && endDate) {
      where.createdAt = Between(startDate, endDate);
    } else if (startDate) {
      where.createdAt = MoreThanOrEqual(startDate);
    } else if (endDate) {
      where.createdAt = LessThanOrEqual(endDate);
    }

    const entries = await this.waitlistRepo.find({ where });

    const totalEntries = entries.length;
    const pending = entries.filter(e => e.status === WaitlistStatus.PENDING).length;
    const seated = entries.filter(e => e.status === WaitlistStatus.SEATED).length;
    const cancelled = entries.filter(e => e.status === WaitlistStatus.CANCELLED).length;
    const noShow = entries.filter(e => e.status === WaitlistStatus.NO_SHOW).length;

    const averageWaitTime = seated > 0
      ? entries
          .filter(e => e.status === WaitlistStatus.SEATED && e.seatedAt && e.createdAt)
          .reduce((sum, e) => {
            const waitTime = e.seatedAt!.getTime() - e.createdAt.getTime();
            return sum + waitTime;
          }, 0) / seated / 1000 / 60 // Convert to minutes
      : 0;

    return {
      clubId,
      period: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null
      },
      entries: {
        total: totalEntries,
        pending,
        seated,
        cancelled,
        noShow
      },
      metrics: {
        averageWaitTimeMinutes: Math.round(averageWaitTime * 100) / 100,
        seatingRate: totalEntries > 0 ? (seated / totalEntries) * 100 : 0,
        cancellationRate: totalEntries > 0 ? (cancelled / totalEntries) * 100 : 0
      }
    };
  }

  async getDashboardStats(clubId: string) {
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [revenueToday, revenueYesterday, playerStats, staffStats, tableStats, waitlistStats] = await Promise.all([
      this.getRevenueAnalytics(clubId, today, new Date()),
      this.getRevenueAnalytics(clubId, yesterday, new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1)),
      this.getPlayerAnalytics(clubId),
      this.getStaffAnalytics(clubId),
      this.getTableAnalytics(clubId),
      this.getWaitlistAnalytics(clubId, today, new Date())
    ]);

    return {
      clubId,
      clubName: club.name,
      date: new Date().toISOString(),
      revenue: {
        today: revenueToday.revenue,
        yesterday: revenueYesterday.revenue,
        change: revenueToday.revenue.totalRevenue - revenueYesterday.revenue.totalRevenue
      },
      players: playerStats.players,
      staff: staffStats.staff,
      tables: tableStats,
      waitlist: waitlistStats.entries
    };
  }
}

