import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlayerChatService } from './player-chat.service';

@Controller('player-chat')
export class PlayerChatController {
  constructor(private readonly chatService: PlayerChatService) {}

  /**
   * Get chat history
   * GET /api/player-chat/history
   */
  @Get('history')
  async getChatHistory(
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
    return this.chatService.getChatHistory(
      playerId.trim(),
      clubId.trim(),
      limitNum,
      offsetNum,
    );
  }

  /**
   * Send chat message
   * POST /api/player-chat/send
   */
  @Post('send')
  async sendMessage(
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
    return this.chatService.sendMessage(
      playerId.trim(),
      clubId.trim(),
      body.message.trim(),
    );
  }

  /**
   * Get active session
   * GET /api/player-chat/session
   */
  @Get('session')
  async getActiveSession(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.chatService.getActiveSession(playerId.trim(), clubId.trim());
  }
}






