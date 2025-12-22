"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const club_entity_1 = require("../club.entity");
const staff_entity_1 = require("../entities/staff.entity");
const credit_request_entity_1 = require("../entities/credit-request.entity");
const financial_transaction_entity_1 = require("../entities/financial-transaction.entity");
const waitlist_entry_entity_1 = require("../entities/waitlist-entry.entity");
const table_entity_1 = require("../entities/table.entity");
let AnalyticsService = class AnalyticsService {
    constructor(clubsRepo, staffRepo, creditRequestsRepo, transactionsRepo, waitlistRepo, tableRepo) {
        this.clubsRepo = clubsRepo;
        this.staffRepo = staffRepo;
        this.creditRequestsRepo = creditRequestsRepo;
        this.transactionsRepo = transactionsRepo;
        this.waitlistRepo = waitlistRepo;
        this.tableRepo = tableRepo;
    }
    async getRevenueAnalytics(clubId, startDate, endDate) {
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const where = { club: { id: clubId } };
        if (startDate && endDate) {
            where.createdAt = (0, typeorm_2.Between)(startDate, endDate);
        }
        else if (startDate) {
            where.createdAt = (0, typeorm_2.MoreThanOrEqual)(startDate);
        }
        else if (endDate) {
            where.createdAt = (0, typeorm_2.LessThanOrEqual)(endDate);
        }
        const transactions = await this.transactionsRepo.find({ where });
        const totalRevenue = transactions
            .filter(t => t.type === financial_transaction_entity_1.TransactionType.DEPOSIT && t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalWithdrawals = transactions
            .filter(t => t.type === financial_transaction_entity_1.TransactionType.WITHDRAWAL && t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalRake = transactions
            .filter(t => t.type === financial_transaction_entity_1.TransactionType.RAKE && t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalTips = transactions
            .filter(t => t.type === financial_transaction_entity_1.TransactionType.TIP && t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const pendingTransactions = transactions.filter(t => t.status === financial_transaction_entity_1.TransactionStatus.PENDING).length;
        const failedTransactions = transactions.filter(t => t.status === financial_transaction_entity_1.TransactionStatus.FAILED).length;
        return {
            clubId,
            period: {
                startDate: (startDate === null || startDate === void 0 ? void 0 : startDate.toISOString()) || null,
                endDate: (endDate === null || endDate === void 0 ? void 0 : endDate.toISOString()) || null
            },
            revenue: {
                totalRevenue,
                totalWithdrawals,
                netRevenue: totalRevenue - totalWithdrawals,
                totalRake,
                totalTips,
                tipHoldPercent: 0.15,
                clubTipShare: totalTips * 0.15,
                staffTipShare: totalTips * 0.85
            },
            transactions: {
                total: transactions.length,
                completed: transactions.filter(t => t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED).length,
                pending: pendingTransactions,
                failed: failedTransactions
            }
        };
    }
    async getPlayerAnalytics(clubId, startDate, endDate) {
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const where = { club: { id: clubId } };
        if (startDate && endDate) {
            where.createdAt = (0, typeorm_2.Between)(startDate, endDate);
        }
        else if (startDate) {
            where.createdAt = (0, typeorm_2.MoreThanOrEqual)(startDate);
        }
        else if (endDate) {
            where.createdAt = (0, typeorm_2.LessThanOrEqual)(endDate);
        }
        const transactions = await this.transactionsRepo.find({ where });
        const waitlistEntries = await this.waitlistRepo.find({ where });
        const playerIds = new Set();
        transactions.forEach(t => {
            if (t.playerId)
                playerIds.add(t.playerId);
        });
        const totalPlayers = playerIds.size;
        const activePlayers = transactions
            .filter(t => t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .map(t => t.playerId)
            .filter((id) => !!id);
        const uniqueActivePlayers = new Set(activePlayers).size;
        const totalDeposits = transactions
            .filter(t => t.type === financial_transaction_entity_1.TransactionType.DEPOSIT && t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const totalWithdrawals = transactions
            .filter(t => t.type === financial_transaction_entity_1.TransactionType.WITHDRAWAL && t.status === financial_transaction_entity_1.TransactionStatus.COMPLETED)
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const averageDeposit = totalPlayers > 0 ? totalDeposits / totalPlayers : 0;
        const averageWithdrawal = totalPlayers > 0 ? totalWithdrawals / totalPlayers : 0;
        return {
            clubId,
            period: {
                startDate: (startDate === null || startDate === void 0 ? void 0 : startDate.toISOString()) || null,
                endDate: (endDate === null || endDate === void 0 ? void 0 : endDate.toISOString()) || null
            },
            players: {
                total: totalPlayers,
                active: uniqueActivePlayers,
                new: waitlistEntries.filter(e => e.status === waitlist_entry_entity_1.WaitlistStatus.PENDING).length
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
    async getStaffAnalytics(clubId) {
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const staff = await this.staffRepo.find({
            where: { club: { id: clubId } }
        });
        const totalStaff = staff.length;
        const activeStaff = staff.filter(s => s.status === staff_entity_1.StaffStatus.ACTIVE).length;
        const inactiveStaff = staff.filter(s => s.status === staff_entity_1.StaffStatus.DEACTIVATED).length;
        const byRole = {};
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
    async getTableAnalytics(clubId) {
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const tables = await this.tableRepo.find({
            where: { club: { id: clubId } }
        });
        const totalTables = tables.length;
        const availableTables = tables.filter(t => t.status === table_entity_1.TableStatus.AVAILABLE).length;
        const occupiedTables = tables.filter(t => t.status === table_entity_1.TableStatus.OCCUPIED).length;
        const reservedTables = tables.filter(t => t.status === table_entity_1.TableStatus.RESERVED).length;
        const maintenanceTables = tables.filter(t => t.status === table_entity_1.TableStatus.MAINTENANCE).length;
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
    async getWaitlistAnalytics(clubId, startDate, endDate) {
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const where = { club: { id: clubId } };
        if (startDate && endDate) {
            where.createdAt = (0, typeorm_2.Between)(startDate, endDate);
        }
        else if (startDate) {
            where.createdAt = (0, typeorm_2.MoreThanOrEqual)(startDate);
        }
        else if (endDate) {
            where.createdAt = (0, typeorm_2.LessThanOrEqual)(endDate);
        }
        const entries = await this.waitlistRepo.find({ where });
        const totalEntries = entries.length;
        const pending = entries.filter(e => e.status === waitlist_entry_entity_1.WaitlistStatus.PENDING).length;
        const seated = entries.filter(e => e.status === waitlist_entry_entity_1.WaitlistStatus.SEATED).length;
        const cancelled = entries.filter(e => e.status === waitlist_entry_entity_1.WaitlistStatus.CANCELLED).length;
        const noShow = entries.filter(e => e.status === waitlist_entry_entity_1.WaitlistStatus.NO_SHOW).length;
        const averageWaitTime = seated > 0
            ? entries
                .filter(e => e.status === waitlist_entry_entity_1.WaitlistStatus.SEATED && e.seatedAt && e.createdAt)
                .reduce((sum, e) => {
                const waitTime = e.seatedAt.getTime() - e.createdAt.getTime();
                return sum + waitTime;
            }, 0) / seated / 1000 / 60
            : 0;
        return {
            clubId,
            period: {
                startDate: (startDate === null || startDate === void 0 ? void 0 : startDate.toISOString()) || null,
                endDate: (endDate === null || endDate === void 0 ? void 0 : endDate.toISOString()) || null
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
    async getDashboardStats(clubId) {
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __param(1, (0, typeorm_1.InjectRepository)(staff_entity_1.Staff)),
    __param(2, (0, typeorm_1.InjectRepository)(credit_request_entity_1.CreditRequest)),
    __param(3, (0, typeorm_1.InjectRepository)(financial_transaction_entity_1.FinancialTransaction)),
    __param(4, (0, typeorm_1.InjectRepository)(waitlist_entry_entity_1.WaitlistEntry)),
    __param(5, (0, typeorm_1.InjectRepository)(table_entity_1.Table)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map