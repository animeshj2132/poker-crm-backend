import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlayerPlaytimeService } from './player-playtime.service';

@Controller('player-playtime')
export class PlayerPlaytimeController {
  constructor(private readonly playtimeService: PlayerPlaytimeService) {}

  /**
   * Get current session
   * GET /api/player-playtime/current
   */
  @Get('current')
  async getCurrentSession(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.playtimeService.getCurrentSession(playerId.trim(), clubId.trim());
  }

  /**
   * Get session history
   * GET /api/player-playtime/history
   */
  @Get('history')
  async getSessionHistory(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.playtimeService.getSessionHistory(
      playerId.trim(),
      clubId.trim(),
      limitNum,
      offsetNum,
    );
  }

  /**
   * Start call time
   * POST /api/player-playtime/call-time
   */
  @Post('call-time')
  async startCallTime(
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
    return this.playtimeService.startCallTime(
      playerId.trim(),
      clubId.trim(),
      body?.tableId,
    );
  }

  /**
   * Request cash out
   * POST /api/player-playtime/cash-out
   */
  @Post('cash-out')
  async requestCashOut(
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
    return this.playtimeService.requestCashOut(
      playerId.trim(),
      clubId.trim(),
      body?.amount,
    );
  }
}












