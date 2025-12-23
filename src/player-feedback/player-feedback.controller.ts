import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlayerFeedbackService } from './player-feedback.service';

@Controller('player-feedback')
export class PlayerFeedbackController {
  constructor(private readonly feedbackService: PlayerFeedbackService) {}

  /**
   * Get player's feedback history
   * GET /api/player-feedback/my
   */
  @Get('my')
  async getMyFeedback(
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
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.feedbackService.getMyFeedback(
      playerId.trim(),
      clubId.trim(),
      limitNum,
      offsetNum,
    );
  }

  /**
   * Submit feedback
   * POST /api/player-feedback/submit
   */
  @Post('submit')
  async submitFeedback(
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
    if (!body?.message || !body.message.trim()) {
      throw new BadRequestException('Message is required');
    }
    return this.feedbackService.submitFeedback(
      playerId.trim(),
      clubId.trim(),
      body.message.trim(),
      body.category || 'general',
      body.rating,
    );
  }

  /**
   * Get feedback stats
   * GET /api/player-feedback/stats
   */
  @Get('stats')
  async getFeedbackStats(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.feedbackService.getFeedbackStats(playerId.trim(), clubId.trim());
  }
}


