import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, ILike, IsNull } from 'typeorm';
import { SalaryPayment, PayPeriod } from '../entities/salary-payment.entity';
import { DealerTips, TipStatus } from '../entities/dealer-tips.entity';
import { DealerCashout } from '../entities/dealer-cashout.entity';
import { TipSettings } from '../entities/tip-settings.entity';
import { Staff, StaffRole } from '../entities/staff.entity';
import { ProcessSalaryDto } from '../dto/process-salary.dto';
import { ProcessDealerTipsDto } from '../dto/process-dealer-tips.dto';
import { ProcessDealerCashoutDto } from '../dto/process-dealer-cashout.dto';
import { UpdateTipSettingsDto } from '../dto/update-tip-settings.dto';

@Injectable()
export class PayrollService {
  constructor(
    @InjectRepository(SalaryPayment)
    private salaryPaymentRepo: Repository<SalaryPayment>,
    @InjectRepository(DealerTips)
    private dealerTipsRepo: Repository<DealerTips>,
    @InjectRepository(DealerCashout)
    private dealerCashoutRepo: Repository<DealerCashout>,
    @InjectRepository(TipSettings)
    private tipSettingsRepo: Repository<TipSettings>,
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
  ) {}

  // ====================
  // SALARY PROCESSING
  // ====================

  async processSalary(clubId: string, dto: ProcessSalaryDto, userId?: string) {
    // Verify staff exists
    const staff = await this.staffRepo.findOne({
      where: { id: dto.staffId, club: { id: clubId } },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Calculate amounts
    const overtimeAmount = dto.overtimeAmount || 0;
    const deductions = dto.deductions || 0;
    const grossAmount = Number(dto.baseSalary) + Number(overtimeAmount);
    const netAmount = grossAmount - Number(deductions);

    const salaryPayment = this.salaryPaymentRepo.create({
      clubId,
      staffId: dto.staffId,
      payPeriod: dto.payPeriod,
      baseSalary: dto.baseSalary,
      overtimeHours: dto.overtimeHours || 0,
      overtimeAmount,
      deductions,
      grossAmount,
      netAmount,
      paymentDate: new Date(),
      periodStartDate: new Date(dto.periodStartDate),
      periodEndDate: new Date(dto.periodEndDate),
      notes: dto.notes,
      processedBy: userId,
    });

    const saved = await this.salaryPaymentRepo.save(salaryPayment);
    return this.salaryPaymentRepo.findOne({
      where: { id: saved.id },
      relations: ['staff'],
    });
  }

  async getSalaryPayments(
    clubId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    staffId?: string,
  ) {
    const queryBuilder = this.salaryPaymentRepo
      .createQueryBuilder('salary')
      .leftJoinAndSelect('salary.staff', 'staff')
      .where('salary.clubId = :clubId', { clubId })
      .orderBy('salary.paymentDate', 'DESC')
      .addOrderBy('salary.createdAt', 'DESC');

    // Search across all pages
    if (search) {
      queryBuilder.andWhere('(staff.name ILIKE :search OR staff.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('salary.paymentDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('salary.paymentDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('salary.paymentDate <= :endDate', { endDate });
    }

    if (staffId) {
      queryBuilder.andWhere('salary.staffId = :staffId', { staffId });
    }

    const [payments, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSalaryPaymentById(clubId: string, paymentId: string) {
    const payment = await this.salaryPaymentRepo.findOne({
      where: { id: paymentId, clubId },
      relations: ['staff'],
    });

    if (!payment) {
      throw new NotFoundException('Salary payment not found');
    }

    return payment;
  }

  // ====================
  // DEALER TIPS
  // ====================

  async getTipSettings(clubId: string, dealerId?: string) {
    // If dealerId provided, get dealer-specific settings, otherwise get club-wide defaults
    const where: any = { clubId };
    if (dealerId) {
      where.dealerId = dealerId;
    } else {
      where.dealerId = IsNull(); // Club-wide defaults
    }

    let settings = await this.tipSettingsRepo.findOne({
      where,
    });

    if (!settings) {
      // If no dealer-specific settings, try to get club-wide defaults
      if (dealerId) {
        const clubDefaults = await this.tipSettingsRepo.findOne({
          where: { clubId, dealerId: IsNull() },
        });
        if (clubDefaults) {
          // Create dealer-specific settings based on club defaults
          settings = this.tipSettingsRepo.create({
            clubId,
            dealerId,
            clubHoldPercentage: clubDefaults.clubHoldPercentage,
            dealerSharePercentage: clubDefaults.dealerSharePercentage,
            floorManagerPercentage: clubDefaults.floorManagerPercentage,
          });
          await this.tipSettingsRepo.save(settings);
        } else {
          // Create default settings
          settings = this.tipSettingsRepo.create({
            clubId,
            dealerId: dealerId,
            clubHoldPercentage: 15,
            dealerSharePercentage: 85,
            floorManagerPercentage: 5,
          });
          await this.tipSettingsRepo.save(settings);
        }
      } else {
        // Create club-wide default settings
        settings = this.tipSettingsRepo.create({
          clubId,
          dealerId: undefined,
          clubHoldPercentage: 15,
          dealerSharePercentage: 85,
          floorManagerPercentage: 5,
        });
        await this.tipSettingsRepo.save(settings);
      }
    }

    return settings;
  }

  async updateTipSettings(clubId: string, dto: UpdateTipSettingsDto, userId?: string, dealerId?: string) {
    // Validate percentages add up correctly
    const total = Number(dto.clubHoldPercentage) + Number(dto.dealerSharePercentage) + Number(dto.floorManagerPercentage);
    if (Math.abs(total - 100) > 0.01) {
      throw new BadRequestException('Percentages must add up to 100%');
    }

    const where: any = { clubId };
    if (dealerId) {
      where.dealerId = dealerId;
    } else {
      where.dealerId = IsNull(); // Club-wide defaults
    }

    let settings = await this.tipSettingsRepo.findOne({
      where,
    });

    if (!settings) {
      settings = this.tipSettingsRepo.create({
        clubId,
        dealerId: dealerId || undefined,
        ...dto,
        updatedBy: userId,
      });
    } else {
      Object.assign(settings, dto, { updatedBy: userId });
    }

    return await this.tipSettingsRepo.save(settings);
  }

  async processDealerTips(clubId: string, dto: ProcessDealerTipsDto, userId?: string) {
    // Verify dealer exists
    const dealer = await this.staffRepo.findOne({
      where: { id: dto.dealerId, club: { id: clubId }, role: StaffRole.DEALER },
    });

    if (!dealer) {
      throw new NotFoundException('Dealer not found');
    }

    // Get tip settings for this specific dealer
    const settings = await this.getTipSettings(clubId, dto.dealerId);

    // Calculate distribution
    const totalTips = Number(dto.totalTips);
    const clubHoldAmount = (totalTips * Number(settings.clubHoldPercentage)) / 100;
    const dealerShareAmount = (totalTips * Number(settings.dealerSharePercentage)) / 100;
    const floorManagerAmount = (totalTips * Number(settings.floorManagerPercentage)) / 100;

    const dealerTips = this.dealerTipsRepo.create({
      clubId,
      dealerId: dto.dealerId,
      tipDate: new Date(dto.tipDate),
      totalTips,
      clubHoldPercentage: settings.clubHoldPercentage,
      clubHoldAmount,
      dealerSharePercentage: settings.dealerSharePercentage,
      dealerShareAmount,
      floorManagerPercentage: settings.floorManagerPercentage,
      floorManagerAmount,
      status: TipStatus.PROCESSED,
      notes: dto.notes,
      processedBy: userId,
    });

    const saved = await this.dealerTipsRepo.save(dealerTips);
    return this.dealerTipsRepo.findOne({
      where: { id: saved.id },
      relations: ['dealer'],
    });
  }

  async getDealerTips(
    clubId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    dealerId?: string,
    status?: TipStatus,
  ) {
    const queryBuilder = this.dealerTipsRepo
      .createQueryBuilder('tips')
      .leftJoinAndSelect('tips.dealer', 'dealer')
      .where('tips.clubId = :clubId', { clubId })
      .orderBy('tips.tipDate', 'DESC')
      .addOrderBy('tips.createdAt', 'DESC');

    if (search) {
      queryBuilder.andWhere('dealer.name ILIKE :search', { search: `%${search}%` });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('tips.tipDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (dealerId) {
      queryBuilder.andWhere('tips.dealerId = :dealerId', { dealerId });
    }

    if (status) {
      queryBuilder.andWhere('tips.status = :status', { status });
    }

    const [tips, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      tips,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDealerTipsSummary(clubId: string, dealerId: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.dealerTipsRepo
      .createQueryBuilder('tips')
      .select('SUM(tips.total_tips)', 'totalTips')
      .addSelect('SUM(tips.dealer_share_amount)', 'totalDealerShare')
      .addSelect('COUNT(tips.id)', 'count')
      .where('tips.club_id = :clubId', { clubId })
      .andWhere('tips.dealer_id = :dealerId', { dealerId });

    if (startDate && endDate) {
      queryBuilder.andWhere('tips.tip_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const result = await queryBuilder.getRawOne();
    return {
      totalTips: Number(result.totalTips || 0),
      totalDealerShare: Number(result.totalDealerShare || 0),
      count: Number(result.count || 0),
    };
  }

  // ====================
  // DEALER CASHOUTS
  // ====================

  async processDealerCashout(clubId: string, dto: ProcessDealerCashoutDto, userId?: string) {
    // Verify dealer exists
    const dealer = await this.staffRepo.findOne({
      where: { id: dto.dealerId, club: { id: clubId }, role: StaffRole.DEALER },
    });

    if (!dealer) {
      throw new NotFoundException('Dealer not found');
    }

    const cashout = this.dealerCashoutRepo.create({
      clubId,
      dealerId: dto.dealerId,
      cashoutDate: new Date(dto.cashoutDate),
      amount: dto.amount,
      notes: dto.notes,
      processedBy: userId,
    });

    const saved = await this.dealerCashoutRepo.save(cashout);
    return this.dealerCashoutRepo.findOne({
      where: { id: saved.id },
      relations: ['dealer'],
    });
  }

  async getDealerCashouts(
    clubId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    dealerId?: string,
  ) {
    const queryBuilder = this.dealerCashoutRepo
      .createQueryBuilder('cashout')
      .leftJoinAndSelect('cashout.dealer', 'dealer')
      .where('cashout.clubId = :clubId', { clubId })
      .orderBy('cashout.cashoutDate', 'DESC')
      .addOrderBy('cashout.createdAt', 'DESC');

    if (search) {
      queryBuilder.andWhere('dealer.name ILIKE :search', { search: `%${search}%` });
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('cashout.cashoutDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    if (dealerId) {
      queryBuilder.andWhere('cashout.dealerId = :dealerId', { dealerId });
    }

    const [cashouts, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      cashouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ====================
  // STAFF LIST
  // ====================

  async getAllStaffForPayroll(clubId: string) {
    const staff = await this.staffRepo.find({
      where: { club: { id: clubId } },
      order: { name: 'ASC' },
    });

    return staff;
  }

  async getDealersForPayroll(clubId: string) {
    const dealers = await this.staffRepo.find({
      where: { club: { id: clubId }, role: StaffRole.DEALER },
      order: { name: 'ASC' },
    });

    return dealers;
  }
}

