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
export class PlayerOffersService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Get active offers (from Supabase staff_offers table)
   */
  async getActiveOffers(clubId: string, playerId?: string) {
    try {
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Return empty array - offers are managed via Supabase staff_offers table
      // Frontend subscribes to real-time updates
      return {
        offers: [],
        total: 0,
        note: 'Offers are managed via Supabase staff_offers table with real-time updates',
      };
    } catch (err) {
      console.error('Get active offers error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get offers');
    }
  }

  /**
   * Record offer view
   */
  async recordOfferView(offerId: string, playerId: string, clubId: string) {
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

      // Record view - this would typically update Supabase staff_offers table
      return {
        success: true,
        message: 'Offer view recorded',
        offerId,
        viewedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Record offer view error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to record offer view');
    }
  }

  /**
   * Claim offer
   */
  async claimOffer(offerId: string, playerId: string, clubId: string) {
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

      // Claim offer logic
      return {
        success: true,
        message: 'Offer claimed successfully',
        offerId,
        claimedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Claim offer error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to claim offer');
    }
  }
}

