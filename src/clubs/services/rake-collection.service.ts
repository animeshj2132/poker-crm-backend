import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not } from 'typeorm';
import { RakeCollection } from '../entities/rake-collection.entity';
import { Table, TableStatus } from '../entities/table.entity';
import { User } from '../../users/user.entity';
import { CreateRakeCollectionDto } from '../dto/create-rake-collection.dto';
import { QueryRakeCollectionsDto } from '../dto/query-rake-collections.dto';

@Injectable()
export class RakeCollectionService {
  constructor(
    @InjectRepository(RakeCollection)
    private rakeCollectionRepo: Repository<RakeCollection>,
    @InjectRepository(Table)
    private tableRepo: Repository<Table>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async createRakeCollection(
    clubId: string,
    dto: CreateRakeCollectionDto,
    collectedByUserId: string
  ): Promise<RakeCollection> {
    // Validate table exists and belongs to club
    const table = await this.tableRepo.findOne({
      where: { id: dto.tableId, club: { id: clubId } },
      relations: ['club']
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Get user who collected
    const user = await this.userRepo.findOne({ where: { id: collectedByUserId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create rake collection
    const rakeCollection = this.rakeCollectionRepo.create({
      club: { id: clubId } as any,
      table: { id: dto.tableId } as any,
      tableNumber: table.tableNumber,
      sessionDate: new Date(dto.sessionDate),
      chipDenomination: dto.chipDenomination || null,
      totalRakeAmount: dto.totalRakeAmount,
      notes: dto.notes || null,
      collectedBy: user,
      collectedByName: user.displayName || user.email,
      collectedAt: new Date(),
    });

    return await this.rakeCollectionRepo.save(rakeCollection);
  }

  async getRakeCollections(
    clubId: string,
    query: QueryRakeCollectionsDto
  ): Promise<{ collections: RakeCollection[]; total: number; page: number; totalPages: number }> {
    const queryBuilder = this.rakeCollectionRepo.createQueryBuilder('rake')
      .leftJoinAndSelect('rake.table', 'table')
      .leftJoinAndSelect('rake.collectedBy', 'collectedBy')
      .where('rake.club.id = :clubId', { clubId });

    // Filter by date range
    if (query.startDate && query.endDate) {
      queryBuilder.andWhere('rake.sessionDate BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      });
    } else if (query.startDate) {
      queryBuilder.andWhere('rake.sessionDate >= :startDate', {
        startDate: query.startDate,
      });
    } else if (query.endDate) {
      queryBuilder.andWhere('rake.sessionDate <= :endDate', {
        endDate: query.endDate,
      });
    }

    // Filter by table
    if (query.tableId) {
      queryBuilder.andWhere('rake.table.id = :tableId', { tableId: query.tableId });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const collections = await queryBuilder
      .orderBy('rake.collectedAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      collections,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRakeCollectionStats(clubId: string, startDate?: string, endDate?: string) {
    const queryBuilder = this.rakeCollectionRepo.createQueryBuilder('rake')
      .where('rake.club.id = :clubId', { clubId });

    if (startDate && endDate) {
      queryBuilder.andWhere('rake.sessionDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('rake.sessionDate >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('rake.sessionDate <= :endDate', { endDate });
    }

    const collections = await queryBuilder.getMany();

    const totalEntries = collections.length;
    const totalCollected = collections.reduce((sum, c) => sum + Number(c.totalRakeAmount || 0), 0);
    const avgPerEntry = totalEntries > 0 ? totalCollected / totalEntries : 0;

    // Get unique tables
    const uniqueTables = new Set(collections.map(c => c.tableNumber));
    const avgPerTable = uniqueTables.size > 0 ? totalCollected / uniqueTables.size : 0;

    return {
      totalEntries,
      totalCollected: Number(totalCollected.toFixed(2)),
      avgPerEntry: Number(avgPerEntry.toFixed(2)),
      avgPerTable: Number(avgPerTable.toFixed(2)),
    };
  }

  async getActiveTables(clubId: string) {
    // Show all tables (not just OCCUPIED) so managers can collect rake from any table
    return await this.tableRepo.find({
      where: {
        club: { id: clubId },
        // Show all tables except CLOSED ones
        status: Not(TableStatus.CLOSED),
      },
      order: { tableNumber: 'ASC' },
    });
  }
}

