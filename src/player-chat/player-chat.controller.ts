import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
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
      body.playerName || undefined
    );
  }

  /**
   * Get all chat sessions for a player (including closed), with pagination
   * GET /api/player-chat/sessions
   */
  @Get('sessions')
  async getPlayerSessions(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 10) : 10;
    return this.chatService.getPlayerSessions(
      playerId.trim(),
      clubId.trim(),
      pageNum,
      limitNum,
    );
  }

  /**
   * Get messages for a specific session (for viewing closed ticket history)
   * GET /api/player-chat/sessions/:sessionId/messages
   */
  @Get('sessions/:sessionId/messages')
  async getSessionMessages(
    @Param('sessionId') sessionId: string,
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 50;
    return this.chatService.getSessionMessages(
      playerId.trim(),
      clubId.trim(),
      sessionId,
      pageNum,
      limitNum,
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







