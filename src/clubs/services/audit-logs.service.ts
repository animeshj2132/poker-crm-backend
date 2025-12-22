import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditLogAction } from '../entities/audit-log.entity';
import { Club } from '../club.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog) private readonly logsRepo: Repository<AuditLog>
  ) {}

  async create(data: {
    action: AuditLogAction;
    entityType: string;
    entityId?: string;
    userId?: string;
    userEmail?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    club?: Club;
  }) {
    const log = this.logsRepo.create(data);
    return this.logsRepo.save(log);
  }

  async findAll(clubId?: string, limit = 100) {
    const where: any = {};
    if (clubId) where.club = { id: clubId };
    return this.logsRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async findByEntity(entityType: string, entityId: string, clubId?: string) {
    const where: any = { entityType, entityId };
    if (clubId) where.club = { id: clubId };
    return this.logsRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }
}

