import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CreditRequest, CreditRequestStatus } from '../entities/credit-request.entity';
import { TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER } from '../entities/financial-transaction.entity';
import { Player } from '../entities/player.entity';
import { Club } from '../club.entity';
import { EventsService } from '../../events/events.service';

@Injectable()
export class CreditRequestsService {
  constructor(
    @InjectRepository(CreditRequest) private readonly creditRequestsRepo: Repository<CreditRequest>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>,
    @InjectDataSource() private readonly dataSource: DataSource,
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

    const saved = await this.dataSource.transaction(async (manager) => {
      const playerRepo = manager.getRepository(Player);
      const player = await playerRepo.findOne({
        where: { id: data.playerId.trim(), club: { id: clubId } },
        relations: ['club'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!player) {
        throw new NotFoundException('Player not found');
      }
      if (!(player as any).creditEnabled) {
        throw new ForbiddenException(
          'Credit facility is not enabled for this player. Enable credit before creating a request.',
        );
      }

      const existingRequest = await manager.getRepository(CreditRequest).findOne({
        where: {
          club: { id: clubId },
          playerId: data.playerId.trim(),
          status: CreditRequestStatus.PENDING,
        },
      });
      if (existingRequest) {
        throw new ConflictException('A pending credit request already exists for this player');
      }

      const request = manager.getRepository(CreditRequest).create({
        playerId: data.playerId.trim(),
        playerName: data.playerName.trim(),
        amount: data.amount,
        notes: data.notes?.trim() || null,
        status: CreditRequestStatus.PENDING,
        visibleToPlayer: true,
        limit: data.amount,
        club,
      });

      return manager.getRepository(CreditRequest).save(request);
    });

    if (this.eventsService) {
      this.eventsService.emitCreditRequestCreated(clubId, data.playerId.trim());
    }
    return saved;
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
      where: { id, club: { id: clubId } },
      relations: ['club']
    });
    if (!request) throw new NotFoundException('Credit request not found');
    return request;
  }

  /**
   * If the player is seated at a table, post a completed Credit ledger row so session table balance
   * (wallet + table views, hologram) includes the approved amount in real time.
   */
  private async insertApprovedCreditToTableLedger(
    manager: EntityManager,
    clubId: string,
    savedRequest: CreditRequest,
    approvedByDisplay?: string,
  ): Promise<number> {
    const playerId = String(savedRequest.playerId || '').trim();
    if (!playerId) return 0;

    const seated = await manager.query(
      `SELECT table_number FROM waitlist_entries
       WHERE club_id = $1 AND player_id = $2 AND status = 'SEATED'
       LIMIT 1`,
      [clubId, playerId],
    );
    if (!seated?.length || seated[0].table_number == null) return 0;

    const drawAmount = Math.min(
      Number(savedRequest.amount) || 0,
      Number(savedRequest.limit) || 0,
    );
    if (!(drawAmount > 0)) return 0;

    const tableNumber = seated[0].table_number;
    const trows = await manager.query(
      `SELECT table_type FROM tables WHERE club_id = $1 AND table_number = $2 LIMIT 1`,
      [clubId, tableNumber],
    );
    const gameType =
      String(trows?.[0]?.table_type || '').toUpperCase() === 'RUMMY' ? 'rummy' : 'poker';

    const playerName = (savedRequest.playerName || 'Player').trim();
    const by = String(approvedByDisplay || 'Staff')
      .replace(/\|/g, ' ')
      .trim()
      .substring(0, 120) || 'Staff';
    const noteText = `Credit approved while seated — Table ${tableNumber} — approved by ${by} (₹${drawAmount})`;

    await manager.query(
      `INSERT INTO financial_transactions
       (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Credit', 'Completed', $5, $6, NOW(), NOW())`,
      [
        clubId,
        playerId,
        playerName,
        drawAmount,
        gameType,
        noteText,
      ],
    );

    // Mirror cash-to-table: show Table Buy In in recent activity (wallet −) while chips stay on Credit row.
    const walletPairNote = `Table buy-in — credit line to table — Table ${tableNumber} (${TABLE_BUY_IN_CREDIT_LINE_WALLET_PAIR_MARKER}) — pairs with approved credit ₹${drawAmount}`;
    await manager.query(
      `INSERT INTO financial_transactions
       (club_id, player_id, player_name, amount, type, status, game_type, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'Table Buy In', 'Completed', $5, $6, NOW(), NOW())`,
      [clubId, playerId, playerName, drawAmount, gameType, walletPairNote],
    );

    return drawAmount;
  }

  async approve(id: string, clubId: string, limit?: number, approvedByDisplay?: string) {
    const { savedRequest, tableCreditPosted } = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(CreditRequest);
      const request = await repo.findOne({
        where: { id, club: { id: clubId } },
        relations: ['club'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) throw new NotFoundException('Credit request not found');

      if (request.status === CreditRequestStatus.APPROVED) {
        throw new ConflictException('Credit request has already been approved');
      }
      if (request.status === CreditRequestStatus.DENIED) {
        throw new ConflictException('Cannot approve a denied credit request');
      }

      const playerId = String(request.playerId || '').trim();
      const playerRepo = manager.getRepository(Player);
      const player = await playerRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        lock: { mode: 'pessimistic_write' },
      });
      if (!player) {
        throw new NotFoundException('Player not found');
      }
      if (!(player as any).creditEnabled) {
        throw new BadRequestException(
          'Credit facility is locked for this player. Reject this request or re-enable credit before approving.',
        );
      }

      if (limit !== undefined) {
        if (limit < 0) {
          throw new BadRequestException('Credit limit cannot be negative');
        }
        if (limit > 100000000) {
          throw new BadRequestException('Credit limit exceeds maximum of ₹100,000,000');
        }
        request.limit = limit;
      } else {
        request.limit = request.amount;
      }

      request.status = CreditRequestStatus.APPROVED;
      request.visibleToPlayer = true;
      const savedRequest = await repo.save(request);

      const posted = await this.insertApprovedCreditToTableLedger(
        manager,
        clubId,
        savedRequest,
        approvedByDisplay,
      );
      return { savedRequest, tableCreditPosted: posted };
    });

    if (this.eventsService) {
      if (tableCreditPosted > 0) {
        this.eventsService.emitTransactionCreated(clubId, String(savedRequest.playerId));
        this.eventsService.emitBalanceUpdated(clubId, String(savedRequest.playerId));
        this.eventsService.emitBuyInRequestChanged(clubId);
      }
      this.eventsService.emitCreditRequestStatusChange(savedRequest.playerId, clubId, savedRequest);
    }

    return savedRequest;
  }

  async deny(id: string, clubId: string, reason?: string) {
    const request = await this.findOne(id, clubId);

    // Check if already processed
    if (request.status === CreditRequestStatus.DENIED) {
      throw new ConflictException('Credit request has already been denied');
    }
    if (request.status === CreditRequestStatus.APPROVED) {
      throw new ConflictException('Cannot deny an approved credit request');
    }

    request.status = CreditRequestStatus.DENIED;
    request.visibleToPlayer = true;
    request.limit = 0;
    request.rejectionReason = reason?.trim() || null;
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

