import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { PlayerBonus } from '../entities/player-bonus.entity';
import { StaffBonus } from '../entities/staff-bonus.entity';
import { Player } from '../entities/player.entity';
import { Staff } from '../entities/staff.entity';
import { CreatePlayerBonusDto } from '../dto/create-player-bonus.dto';
import { CreateStaffBonusDto } from '../dto/create-staff-bonus.dto';
import { FinancialTransactionsService } from './financial-transactions.service';
import { TransactionType } from '../entities/financial-transaction.entity';

@Injectable()
export class BonusService {
  constructor(
    @InjectRepository(PlayerBonus)
    private playerBonusRepo: Repository<PlayerBonus>,
    @InjectRepository(StaffBonus)
    private staffBonusRepo: Repository<StaffBonus>,
    @InjectRepository(Player)
    private playerRepo: Repository<Player>,
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    private financialTransactionsService: FinancialTransactionsService,
  ) {}

  // ====================
  // PLAYER BONUSES
  // ====================

  async processPlayerBonus(clubId: string, dto: CreatePlayerBonusDto, userId?: string) {
    // Verify player exists
    const player = await this.playerRepo.findOne({
      where: { id: dto.playerId, club: { id: clubId } },
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Create bonus record
    const bonus = this.playerBonusRepo.create({
      clubId,
      playerId: dto.playerId,
      bonusType: dto.bonusType,
      bonusAmount: dto.bonusAmount,
      reason: dto.reason,
      processedBy: userId,
    });

    const savedBonus = await this.playerBonusRepo.save(bonus);

    // Update player balance through financial transactions
    try {
      await this.financialTransactionsService.create(clubId, {
        type: TransactionType.BONUS,
        playerId: dto.playerId,
        playerName: player.name,
        amount: dto.bonusAmount,
        notes: `Bonus: ${dto.bonusType}${dto.reason ? ` - ${dto.reason}` : ''}`,
      });
    } catch (error) {
      console.error('Error creating financial transaction for bonus:', error);
      // Continue even if transaction creation fails - bonus is still recorded
    }

    return this.playerBonusRepo.findOne({
      where: { id: savedBonus.id },
      relations: ['player'],
    });
  }

  async getPlayerBonuses(
    clubId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    playerId?: string,
  ) {
    const queryBuilder = this.playerBonusRepo
      .createQueryBuilder('bonus')
      .leftJoinAndSelect('bonus.player', 'player')
      .where('bonus.clubId = :clubId', { clubId })
      .orderBy('bonus.processedAt', 'DESC')
      .addOrderBy('bonus.createdAt', 'DESC');

    // Search across all pages
    if (search) {
      queryBuilder.andWhere(
        '(player.name ILIKE :search OR player.email ILIKE :search OR player.playerId ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('bonus.processedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('bonus.processedAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('bonus.processedAt <= :endDate', { endDate });
    }

    if (playerId) {
      queryBuilder.andWhere('bonus.playerId = :playerId', { playerId });
    }

    const [bonuses, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      bonuses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ====================
  // STAFF BONUSES
  // ====================

  async processStaffBonus(clubId: string, dto: CreateStaffBonusDto, userId?: string) {
    // Verify staff exists
    const staff = await this.staffRepo.findOne({
      where: { id: dto.staffId, club: { id: clubId } },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Create bonus record
    const bonus = this.staffBonusRepo.create({
      clubId,
      staffId: dto.staffId,
      bonusType: dto.bonusType,
      bonusAmount: dto.bonusAmount,
      reason: dto.reason,
      processedBy: userId,
    });

    const savedBonus = await this.staffBonusRepo.save(bonus);

    return this.staffBonusRepo.findOne({
      where: { id: savedBonus.id },
      relations: ['staff'],
    });
  }

  async getStaffBonuses(
    clubId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    startDate?: string,
    endDate?: string,
    staffId?: string,
  ) {
    const queryBuilder = this.staffBonusRepo
      .createQueryBuilder('bonus')
      .leftJoinAndSelect('bonus.staff', 'staff')
      .where('bonus.clubId = :clubId', { clubId })
      .orderBy('bonus.processedAt', 'DESC')
      .addOrderBy('bonus.createdAt', 'DESC');

    // Search across all pages
    if (search) {
      queryBuilder.andWhere(
        '(staff.name ILIKE :search OR staff.email ILIKE :search OR staff.employeeId ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (startDate && endDate) {
      queryBuilder.andWhere('bonus.processedAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('bonus.processedAt >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('bonus.processedAt <= :endDate', { endDate });
    }

    if (staffId) {
      queryBuilder.andWhere('bonus.staffId = :staffId', { staffId });
    }

    const [bonuses, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      bonuses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ====================
  // GET LISTS
  // ====================

  async getAllPlayersForBonus(clubId: string, search?: string) {
    const queryBuilder = this.playerRepo
      .createQueryBuilder('player')
      .where('player.club_id = :clubId', { clubId })
      .andWhere('(player.kycStatus = :approved OR player.kycStatus = :verified)', {
        approved: 'approved',
        verified: 'verified',
      })
      .orderBy('player.name', 'ASC');

    // Search by name, email, phone, or playerId
    if (search && search.trim().length >= 3) {
      queryBuilder.andWhere(
        '(player.name ILIKE :search OR player.email ILIKE :search OR player.phoneNumber ILIKE :search OR player.playerId ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    return await queryBuilder.getMany();
  }

  async getAllStaffForBonus(clubId: string, search?: string) {
    const queryBuilder = this.staffRepo
      .createQueryBuilder('staff')
      .where('staff.club_id = :clubId', { clubId })
      .orderBy('staff.name', 'ASC');

    // Search by name, email, phone, or employeeId
    if (search && search.trim().length >= 3) {
      queryBuilder.andWhere(
        '(staff.name ILIKE :search OR staff.email ILIKE :search OR staff.phone ILIKE :search OR staff.employeeId ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }

    return await queryBuilder.getMany();
  }
}

