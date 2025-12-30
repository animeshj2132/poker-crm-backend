import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlayerOffersService } from './player-offers.service';

@Controller('player-offers')
export class PlayerOffersController {
  constructor(private readonly offersService: PlayerOffersService) {}

  /**
   * Get active offers for player
   * GET /api/player-offers/active
   */
  @Get('active')
  async getActiveOffers(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.offersService.getActiveOffers(clubId.trim(), playerId?.trim());
  }

  /**
   * Record offer view
   * POST /api/player-offers/view
   */
  @Post('view')
  async recordOfferView(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: any,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!body?.offerId) {
      throw new BadRequestException('offerId is required');
    }
    return this.offersService.recordOfferView(
      body.offerId,
      playerId.trim(),
      clubId.trim(),
    );
  }

  /**
   * Claim offer
   * POST /api/player-offers/claim
   */
  @Post('claim')
  async claimOffer(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: any,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!body?.offerId) {
      throw new BadRequestException('offerId is required');
    }
    return this.offersService.claimOffer(
      body.offerId,
      playerId.trim(),
      clubId.trim(),
    );
  }
}













