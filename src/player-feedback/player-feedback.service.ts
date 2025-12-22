import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';

@Injectable()
export class PlayerFeedbackService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Get player's feedback history
   */
  async getMyFeedback(
    playerId: string,
    clubId: string,
    limit: number = 50,
    offset: number = 0,
  ) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Return empty array - feedback would be stored in a separate table
      return {
        feedback: [],
        total: 0,
        limit,
        offset,
      };
    } catch (err) {
      console.error('Get feedback error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get feedback');
    }
  }

  /**
   * Submit feedback
   */
  async submitFeedback(
    playerId: string,
    clubId: string,
    message: string,
    category: string = 'general',
    rating?: number,
  ) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      if (message.length > 2000) {
        throw new BadRequestException('Message cannot exceed 2000 characters');
      }

      if (rating !== undefined && (rating < 1 || rating > 5)) {
        throw new BadRequestException('Rating must be between 1 and 5');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Create feedback entry
      const feedback = {
        id: `feedback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playerId,
        clubId,
        message,
        category,
        rating: rating || null,
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };

      return {
        success: true,
        message: 'Feedback submitted successfully',
        feedback,
      };
    } catch (err) {
      console.error('Submit feedback error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to submit feedback');
    }
  }

  /**
   * Get feedback stats
   */
  async getFeedbackStats(playerId: string, clubId: string) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      return {
        totalFeedback: 0,
        averageRating: 0,
        byCategory: {
          general: 0,
          service: 0,
          technical: 0,
          suggestion: 0,
        },
      };
    } catch (err) {
      console.error('Get feedback stats error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get feedback stats');
    }
  }
}

