import { Injectable, NotFoundException, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlayerFieldUpdateRequest } from '../entities/player-field-update-request.entity';
import { Player } from '../entities/player.entity';
import { Club } from '../club.entity';
import { EventsService } from '../../events/events.service';

@Injectable()
export class PlayerFieldUpdateService {
  constructor(
    @InjectRepository(PlayerFieldUpdateRequest)
    private readonly updateRequestsRepo: Repository<PlayerFieldUpdateRequest>,
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(Club)
    private readonly clubsRepo: Repository<Club>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService?: EventsService,
  ) {}

  /**
   * Create a new field update request
   */
  async createUpdateRequest(
    playerId: string,
    clubId: string,
    fieldName: string,
    newValue: string
  ): Promise<PlayerFieldUpdateRequest> {
    // Validate player exists
    const player = await this.playersRepo.findOne({
      where: { id: playerId, club: { id: clubId } }
    });

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    // Validate club exists
    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Validate field name
    const allowedFields = ['name', 'phoneNumber', 'email'];
    if (!allowedFields.includes(fieldName)) {
      throw new BadRequestException(
        `Field ${fieldName} cannot be updated via request. Allowed fields: ${allowedFields.join(', ')}`
      );
    }

    // CRITICAL: PAN Card is IMMUTABLE - can NEVER be changed after initial submission
    if (fieldName === 'panCard' || fieldName === 'pan_card') {
      throw new BadRequestException(
        'PAN Card cannot be changed after initial submission. This is a legal document and must remain immutable. Please contact support if there was an error during registration.'
      );
    }

    // Get current value
    let currentValue: string | null = null;
    if (fieldName === 'name') currentValue = player.name;
    else if (fieldName === 'phoneNumber') currentValue = player.phoneNumber;
    else if (fieldName === 'email') currentValue = player.email;

    // Check if there's already a pending request for this field
    const existingRequest = await this.updateRequestsRepo.findOne({
      where: {
        playerId,
        clubId,
        fieldName,
        status: 'pending'
      }
    });

    if (existingRequest) {
      throw new BadRequestException(
        `You already have a pending update request for ${fieldName}. Please wait for it to be reviewed.`
      );
    }

    // Create the request
    const request = this.updateRequestsRepo.create({
      playerId,
      clubId,
      fieldName,
      currentValue,
      requestedValue: newValue,
      status: 'pending'
    });

    const saved = await this.updateRequestsRepo.save(request);
    if (this.eventsService) {
      this.eventsService.emitProfileChangeRequestUpdated(clubId, playerId, { status: 'pending' });
    }
    return saved;
  }

  /**
   * Get all pending update requests for a club
   */
  async getPendingRequests(clubId: string): Promise<PlayerFieldUpdateRequest[]> {
    return await this.updateRequestsRepo.find({
      where: { clubId, status: 'pending' },
      relations: ['player'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get all update requests for a specific player
   */
  async getPlayerRequests(playerId: string, clubId: string): Promise<PlayerFieldUpdateRequest[]> {
    return await this.updateRequestsRepo.find({
      where: { playerId, clubId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Approve a field update request
   */
  async approveRequest(
    requestId: string,
    reviewerId: string
  ): Promise<{ success: boolean; message: string }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the request
      const request = await queryRunner.manager.findOne(PlayerFieldUpdateRequest, {
        where: { id: requestId },
        relations: ['player']
      });

      if (!request) {
        throw new NotFoundException('Update request not found');
      }

      if (request.status !== 'pending') {
        throw new BadRequestException('This request has already been processed');
      }

      // Update the player field
      const player = await queryRunner.manager.findOne(Player, {
        where: { id: request.playerId }
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const fn = request.fieldName;
      const rv = (request.requestedValue || '').trim();

      if (fn === 'name') {
        player.name = rv;
      } else if (fn === 'phoneNumber' || fn === 'phone') {
        player.phoneNumber = rv;
      } else if (fn === 'email') {
        player.email = rv;
      } else if (
        fn === 'aadhaar' ||
        fn === 'government_id' ||
        fn === 'aadhaar_front' ||
        fn === 'aadhaar_back' ||
        fn === 'pan_card' ||
        fn === 'profile_photo'
      ) {
        this.applyDocumentApproval(player, request);
      } else {
        throw new BadRequestException(`Unsupported field for approval: ${fn}`);
      }

      await queryRunner.manager.save(Player, player);

      // Update the request status
      request.status = 'approved';
      request.reviewerId = reviewerId;
      request.reviewedAt = new Date();
      request.reviewNotes = `Approved by staff`;
      await queryRunner.manager.save(PlayerFieldUpdateRequest, request);

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitProfileChangeRequestUpdated(
          request.clubId,
          request.playerId,
          { status: 'approved', fieldName: request.fieldName, newValue: request.requestedValue }
        );
      }

      return {
        success: true,
        message: `Player ${request.fieldName} updated successfully`
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reject a field update request
   */
  async rejectRequest(
    requestId: string,
    reviewerId: string,
    rejectionReason: string
  ): Promise<{ success: boolean; message: string }> {
    const request = await this.updateRequestsRepo.findOne({
      where: { id: requestId }
    });

    if (!request) {
      throw new NotFoundException('Update request not found');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('This request has already been processed');
    }

    request.status = 'rejected';
    request.reviewerId = reviewerId;
    request.reviewedAt = new Date();
    request.reviewNotes = rejectionReason;

    await this.updateRequestsRepo.save(request);

    if (this.eventsService) {
      this.eventsService.emitProfileChangeRequestUpdated(request.clubId, request.playerId, {
        status: 'rejected',
        fieldName: request.fieldName,
        reviewNotes: rejectionReason,
      });
    }

    return {
      success: true,
      message: 'Update request rejected'
    };
  }

  private buildKycDocEntry(documentType: string, url: string): Record<string, unknown> {
    const now = new Date().toISOString();
    return {
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      type: documentType,
      documentType,
      name: documentType,
      fileName: documentType,
      url,
      fileUrl: url,
      uploadedAt: now,
      createdAt: now,
      status: 'pending',
      size: 0,
      mimeType: 'application/octet-stream',
    };
  }

  private replaceKycDocumentSlots(
    existing: unknown,
    slotUpdates: { type: string; url: string }[],
    alsoRemoveTypes: string[] = [],
  ): Record<string, unknown>[] {
    const documents = Array.isArray(existing) ? [...(existing as Record<string, unknown>[])] : [];
    const remove = new Set([
      ...slotUpdates.map((s) => s.type),
      ...alsoRemoveTypes,
    ]);
    const filtered = documents.filter((d: Record<string, unknown>) => !remove.has((d.type || d.documentType) as string));
    for (const s of slotUpdates) {
      filtered.push(this.buildKycDocEntry(s.type, s.url));
    }
    return filtered;
  }

  private applyDocumentApproval(player: Player, request: PlayerFieldUpdateRequest): void {
    const fn = request.fieldName;
    const rv = (request.requestedValue || '').trim();

    if (fn === 'aadhaar') {
      let parsed: { mode?: string; government_id?: string; aadhaar_front?: string; aadhaar_back?: string };
      try {
        parsed = JSON.parse(rv) as typeof parsed;
      } catch {
        throw new BadRequestException('Invalid Aadhaar change payload');
      }
      if (parsed.mode === 'pdf' && parsed.government_id?.startsWith('http')) {
        player.kycDocuments = this.replaceKycDocumentSlots(
          player.kycDocuments,
          [{ type: 'government_id', url: parsed.government_id }],
          ['aadhaar_front', 'aadhaar_back'],
        ) as any;
        return;
      }
      if (
        parsed.mode === 'image' &&
        parsed.aadhaar_front?.startsWith('http') &&
        parsed.aadhaar_back?.startsWith('http')
      ) {
        player.kycDocuments = this.replaceKycDocumentSlots(
          player.kycDocuments,
          [
            { type: 'aadhaar_front', url: parsed.aadhaar_front },
            { type: 'aadhaar_back', url: parsed.aadhaar_back },
          ],
          ['government_id'],
        ) as any;
        return;
      }
      throw new BadRequestException(
        'Aadhaar request must be PDF (government_id URL) or images (aadhaar_front and aadhaar_back URLs)',
      );
    }

    const singleDocFields = ['government_id', 'aadhaar_front', 'aadhaar_back', 'pan_card', 'profile_photo'];
    if (singleDocFields.includes(fn)) {
      if (!rv.startsWith('http')) {
        throw new BadRequestException('Invalid document URL in request');
      }
      player.kycDocuments = this.replaceKycDocumentSlots(player.kycDocuments, [{ type: fn, url: rv }], []) as any;
      return;
    }

    throw new BadRequestException(`Unsupported document field: ${fn}`);
  }
}
