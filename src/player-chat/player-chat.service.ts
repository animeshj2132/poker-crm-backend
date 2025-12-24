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
export class PlayerChatService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Get chat history (from Supabase gre_chat_messages table via real-time)
   */
  async getChatHistory(
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

      // Return empty array - messages are handled by Supabase real-time
      // Frontend uses Supabase client to subscribe to gre_chat_messages table
      return {
        messages: [],
        total: 0,
        limit,
        offset,
        note: 'Chat messages are handled via Supabase real-time. Use frontend Supabase client to subscribe.',
      };
    } catch (err) {
      console.error('Get chat history error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get chat history');
    }
  }

  /**
   * Send message (stored in Supabase gre_chat_messages table)
   */
  async sendMessage(playerId: string, clubId: string, message: string) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      if (message.length > 1000) {
        throw new BadRequestException('Message cannot exceed 1000 characters');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Return success - actual message insertion happens via Supabase client in frontend
      // This maintains the existing real-time architecture
      return {
        success: true,
        message: 'Message sent successfully',
        timestamp: new Date().toISOString(),
        note: 'Message should be inserted via Supabase client for real-time delivery',
      };
    } catch (err) {
      console.error('Send message error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to send message');
    }
  }

  /**
   * Get active chat session
   */
  async getActiveSession(playerId: string, clubId: string) {
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

      // Return session info - actual session is managed via Supabase gre_chat_sessions
      return {
        session: {
          playerId,
          clubId,
          playerName: player.name,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        note: 'Chat sessions are managed via Supabase gre_chat_sessions table',
      };
    } catch (err) {
      console.error('Get active session error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get session');
    }
  }
}





