import { BadRequestException, ConflictException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditRequest, CreditRequestStatus } from '../entities/credit-request.entity';
import { Club } from '../club.entity';
import { EventsService } from '../../events/events.service';

@Injectable()
export class CreditRequestsService {
  constructor(
    @InjectRepository(CreditRequest) private readonly creditRequestsRepo: Repository<CreditRequest>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @Inject(forwardRef(() => EventsService)) private readonly eventsService?: EventsService
  ) {}

  async create(clubId: string, data: { playerId: string; playerName: string; amount: number; notes?: string }) {
    // Validate inputs
    if (!data.playerId || !data.playerId.trim()) {
      throw new BadRequestException('Player ID is required');
    }
    if (data.playerId.trim().length > 100) {
      throw new BadRequestException('Player ID cannot exceed 100 characters');
    }
    if (!data.playerName || !data.playerName.trim()) {
      throw new BadRequestException('Player name is required');
    }
    if (data.playerName.trim().length > 200) {
      throw new BadRequestException('Player name cannot exceed 200 characters');
    }
    if (data.amount === null || data.amount === undefined) {
      throw new BadRequestException('Amount is required');
    }
    if (typeof data.amount !== 'number' || isNaN(data.amount)) {
      throw new BadRequestException('Amount must be a valid number');
    }
    if (data.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }
    if (data.amount > 100000000) { // 100 million limit
      throw new BadRequestException('Amount exceeds maximum limit of ₹100,000,000');
    }
    if (data.notes && data.notes.trim().length > 500) {
      throw new BadRequestException('Notes cannot exceed 500 characters');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    // Check for existing pending request for same player
    const existingRequest = await this.creditRequestsRepo.findOne({
      where: {
        club: { id: clubId },
        playerId: data.playerId.trim(),
        status: CreditRequestStatus.PENDING
      }
    });
    if (existingRequest) {
      throw new ConflictException('A pending credit request already exists for this player');
    }

    const request = this.creditRequestsRepo.create({
      playerId: data.playerId.trim(),
      playerName: data.playerName.trim(),
      amount: data.amount,
      notes: data.notes?.trim() || null,
      status: CreditRequestStatus.PENDING,
      visibleToPlayer: false,
      limit: 0,
      club
    });

    return this.creditRequestsRepo.save(request);
  }

  async findAll(clubId: string, status?: CreditRequestStatus) {
    const where: any = { club: { id: clubId } };
    if (status) where.status = status;
    return this.creditRequestsRepo.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, clubId: string) {
    const request = await this.creditRequestsRepo.findOne({
      where: { id, club: { id: clubId } }
    });
    if (!request) throw new NotFoundException('Credit request not found');
    return request;
  }

  async approve(id: string, clubId: string, limit?: number) {
    const request = await this.findOne(id, clubId);

    // Check if already processed
    if (request.status === CreditRequestStatus.APPROVED) {
      throw new ConflictException('Credit request has already been approved');
    }
    if (request.status === CreditRequestStatus.DENIED) {
      throw new ConflictException('Cannot approve a denied credit request');
    }

    // Validate limit if provided
    if (limit !== undefined) {
      if (limit < 0) {
        throw new BadRequestException('Credit limit cannot be negative');
      }
      if (limit > 100000000) {
        throw new BadRequestException('Credit limit exceeds maximum of ₹100,000,000');
      }
      request.limit = limit;
    } else {
      // Default limit to amount if not provided
      request.limit = request.amount;
    }

    request.status = CreditRequestStatus.APPROVED;
    request.visibleToPlayer = true;
    const savedRequest = await this.creditRequestsRepo.save(request);
    
    // Emit real-time event
    if (this.eventsService) {
      this.eventsService.emitCreditRequestStatusChange(
        savedRequest.playerId,
        clubId,
        savedRequest
      );
    }
    
    return savedRequest;
  }

  async deny(id: string, clubId: string) {
    const request = await this.findOne(id, clubId);

    // Check if already processed
    if (request.status === CreditRequestStatus.DENIED) {
      throw new ConflictException('Credit request has already been denied');
    }
    if (request.status === CreditRequestStatus.APPROVED) {
      throw new ConflictException('Cannot deny an approved credit request');
    }

    request.status = CreditRequestStatus.DENIED;
    request.visibleToPlayer = false;
    request.limit = 0;
    const savedRequest = await this.creditRequestsRepo.save(request);
    
    // Emit real-time event
    if (this.eventsService) {
      this.eventsService.emitCreditRequestStatusChange(
        savedRequest.playerId,
        clubId,
        savedRequest
      );
    }
    
    return savedRequest;
  }

  async updateVisibility(id: string, clubId: string, visible: boolean) {
    const request = await this.findOne(id, clubId);
    request.visibleToPlayer = visible;
    return this.creditRequestsRepo.save(request);
  }

  async updateLimit(id: string, clubId: string, limit: number) {
    if (limit === null || limit === undefined) {
      throw new BadRequestException('Credit limit is required');
    }
    if (typeof limit !== 'number' || isNaN(limit)) {
      throw new BadRequestException('Credit limit must be a valid number');
    }
    if (limit < 0) {
      throw new BadRequestException('Credit limit cannot be negative');
    }
    if (limit > 100000000) {
      throw new BadRequestException('Credit limit exceeds maximum of ₹100,000,000');
    }

    const request = await this.findOne(id, clubId);
    
    // Only allow limit updates for approved requests
    if (request.status !== CreditRequestStatus.APPROVED) {
      throw new BadRequestException('Can only update limit for approved credit requests');
    }

    request.limit = limit;
    return this.creditRequestsRepo.save(request);
  }
}

