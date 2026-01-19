import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PlayerOffersService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get active offers from staff_offers table
   */
  async getActiveOffers(clubId: string, playerId?: string) {
    try {
      console.log('🎁 [OFFERS] Fetching offers for club:', clubId);
      
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        console.log('❌ [OFFERS] Invalid UUID format:', clubId);
        throw new BadRequestException('Invalid club ID format');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        console.log('❌ [OFFERS] Club not found:', clubId);
        throw new NotFoundException('Club not found');
      }

      console.log('✅ [OFFERS] Club found, querying push_notifications...');

      // Query push_notifications table (where admin creates offers)
      const query = `
        SELECT 
          id,
          club_id,
          title,
          details as description,
          image_url,
          video_url,
          target_type as target_audience,
          notification_type,
          is_active,
          scheduled_at,
          sent_at,
          created_at,
          updated_at
        FROM push_notifications
        WHERE club_id = $1
          AND is_active = true
          AND (target_type = 'all_players' OR notification_type = 'player')
        ORDER BY created_at DESC
      `;

      const offers = await this.dataSource.query(query, [clubId]);

      console.log('🎁 [OFFERS] Query result:', offers.length, 'offers found');
      console.log('🎁 [OFFERS] Raw offers:', JSON.stringify(offers, null, 2));

      return {
        offers: offers.map((offer: any) => ({
          id: offer.id,
          title: offer.title,
          description: offer.description,
          image_url: offer.image_url,
          video_url: offer.video_url,
          offer_type: offer.notification_type === 'player' ? 'promotion' : 'announcement',
          target_audience: offer.target_audience,
          is_active: offer.is_active,
          created_at: offer.created_at,
        })) || [],
        total: offers?.length || 0,
      };
    } catch (err) {
      console.error('❌ [OFFERS] Error:', err);
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

