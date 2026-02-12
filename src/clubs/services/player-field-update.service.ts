import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PlayerFieldUpdateRequest, UpdateRequestStatus } from '../entities/player-field-update-request.entity';
import { Player } from '../entities/player.entity';
import { Club } from '../club.entity';

@Injectable()
export class PlayerFieldUpdateService {
  constructor(
    @InjectRepository(PlayerFieldUpdateRequest)
    private readonly updateRequestsRepo: Repository<PlayerFieldUpdateRequest>,
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(Club)
    private readonly clubsRepo: Repository<Club>,
    private readonly dataSource: DataSource
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

    return await this.updateRequestsRepo.save(request);
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

      // Apply the update based on field name
      if (request.fieldName === 'name') {
        player.name = request.requestedValue;
      } else if (request.fieldName === 'phoneNumber') {
        player.phoneNumber = request.requestedValue;
      } else if (request.fieldName === 'email') {
        player.email = request.requestedValue;
      }

      await queryRunner.manager.save(Player, player);

      // Update the request status
      request.status = 'approved';
      request.reviewerId = reviewerId;
      request.reviewedAt = new Date();
      request.reviewNotes = `Approved by staff`;
      await queryRunner.manager.save(PlayerFieldUpdateRequest, request);

      await queryRunner.commitTransaction();

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

    return {
      success: true,
      message: 'Update request rejected'
    };
  }
}
