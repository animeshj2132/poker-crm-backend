import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { CreateAuditLogDto } from '../dto/create-audit-log.dto';
import { QueryAuditLogsDto } from '../dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepo: Repository<AuditLog>,
  ) {}

  /**
   * Create a new audit log entry
   */
  async createLog(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.auditLogRepo.create(dto);
    return await this.auditLogRepo.save(log);
  }

  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(clubId: string, query: QueryAuditLogsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      staffRole,
      startDate,
      endDate,
    } = query;

    const skip = (page - 1) * limit;

    const queryBuilder = this.auditLogRepo
      .createQueryBuilder('log')
      .where('log.club_id = :clubId', { clubId });

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        "(log.staff_name ILIKE :search OR log.target_name ILIKE :search OR log.description ILIKE :search)",
        { search: `%${search}%` }
      );
    }

    // Category filter
    if (category) {
      queryBuilder.andWhere('log.action_category = :category', { category });
    }

    // Staff role filter
    if (staffRole) {
      queryBuilder.andWhere('log.staff_role = :staffRole', { staffRole });
    }

    // Date range filter
    if (startDate && endDate) {
      queryBuilder.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    } else if (startDate) {
      queryBuilder.andWhere('log.created_at >= :startDate', {
        startDate: new Date(startDate),
      });
    } else if (endDate) {
      queryBuilder.andWhere('log.created_at <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    // Get total count and paginated results
    const [logs, total] = await queryBuilder
      .orderBy('log.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Helper method to log staff actions throughout the application
   */
  async logAction(params: {
    clubId: string;
    staffId?: string;
    staffName: string;
    staffRole: string;
    actionType: string;
    actionCategory: string;
    description: string;
    targetType?: string;
    targetId?: string;
    targetName?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.createLog({
        clubId: params.clubId,
        staffId: params.staffId,
        staffName: params.staffName,
        staffRole: params.staffRole,
        actionType: params.actionType,
        actionCategory: params.actionCategory as any,
        description: params.description,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    } catch (error) {
      // Don't throw errors for audit logging - log silently
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(clubId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.auditLogRepo.find({
      where: {
        clubId,
        createdAt: Between(startDate, new Date()),
      },
    });

    const byCategory = logs.reduce((acc, log) => {
      acc[log.actionCategory] = (acc[log.actionCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byRole = logs.reduce((acc, log) => {
      acc[log.staffRole] = (acc[log.staffRole] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActions: logs.length,
      byCategory,
      byRole,
      period: `Last ${days} days`,
    };
  }
}
