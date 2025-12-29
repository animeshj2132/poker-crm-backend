import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlayerVipService } from './player-vip.service';

@Controller('player-vip')
export class PlayerVipController {
  constructor(private readonly vipService: PlayerVipService) {}

  /**
   * Get VIP points balance
   * GET /api/player-vip/points
   */
  @Get('points')
  async getVipPoints(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.vipService.getVipPoints(playerId.trim(), clubId.trim());
  }

  /**
   * Get club points balance
   * GET /api/player-vip/club-points
   */
  @Get('club-points')
  async getClubPoints(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.vipService.getClubPoints(playerId.trim(), clubId.trim());
  }

  /**
   * Get available rewards
   * GET /api/player-vip/rewards
   */
  @Get('rewards')
  async getAvailableRewards(
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.vipService.getAvailableRewards(clubId.trim());
  }

  /**
   * Redeem VIP points
   * POST /api/player-vip/redeem
   */
  @Post('redeem')
  async redeemPoints(
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
    if (!body?.rewardId) {
      throw new BadRequestException('rewardId is required');
    }
    if (!body?.pointsToRedeem || typeof body.pointsToRedeem !== 'number') {
      throw new BadRequestException('pointsToRedeem is required and must be a number');
    }
    return this.vipService.redeemPoints(
      playerId.trim(),
      clubId.trim(),
      body.rewardId,
      body.pointsToRedeem,
    );
  }
}











