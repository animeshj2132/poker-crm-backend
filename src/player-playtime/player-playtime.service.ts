import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';
import { WaitlistEntry, WaitlistStatus } from '../clubs/entities/waitlist-entry.entity';
import { Table } from '../clubs/entities/table.entity';

@Injectable()
export class PlayerPlaytimeService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table)
    private readonly tablesRepo: Repository<Table>,
    private readonly clubsService: ClubsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get current active session
   */
  async getCurrentSession(playerId: string, clubId: string) {
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

      // Check if player is currently SEATED in waitlist
      const seatedEntry = await this.waitlistRepo.findOne({
        where: {
          club: { id: clubId },
          playerId: playerId,
          status: WaitlistStatus.SEATED,
        },
        order: { seatedAt: 'DESC' },
      });

      if (!seatedEntry || !seatedEntry.tableNumber) {
        return {
          session: null,
          hasActiveSession: false,
        };
      }

      // Get table details
      const table = await this.tablesRepo.findOne({
        where: { club: { id: clubId }, tableNumber: seatedEntry.tableNumber },
        relations: ['club'],
      });

      if (!table) {
        return {
          session: null,
          hasActiveSession: false,
        };
      }

      // Calculate session duration
      const sessionStartTime = seatedEntry.seatedAt || seatedEntry.createdAt;
      const now = new Date();
      const sessionDuration = Math.floor((now.getTime() - new Date(sessionStartTime).getTime()) / 1000); // in seconds

      // Default timing configuration (2 minutes for testing)
      const minPlayTime = 2; // minutes
      const callTimeDuration = 2; // minutes
      const cashOutWindow = 2; // minutes

      // Calculate session state (simplified - always make call time available after min play time)
      const minutesPlayed = Math.floor(sessionDuration / 60);
      const minPlayTimeCompleted = minutesPlayed >= minPlayTime;
      const callTimeAvailable = minPlayTimeCompleted; // Always available after min play time
      const callTimeActive = false; // TODO: Implement call time tracking
      const cashOutWindowActive = false; // TODO: Implement cashout window tracking

      let callTimeRemaining = 0;
      let cashOutTimeRemaining = 0;
      let sessionPhase = minPlayTimeCompleted ? 'CALL_TIME_AVAILABLE' : 'MINIMUM_PLAY';

      const canCashOut = false; // TODO: Implement cashout logic

      // Build session object
      const session = {
        id: seatedEntry.id,
        playerId: player.id,
        tableId: table.id,
        tableName: `Table ${table.tableNumber}`,
        gameType: table.tableType || 'CASH',
        stakes: `₹${table.minBuyIn || 1000}.00/${table.maxBuyIn || 10000}.00`,
        buyInAmount: table.minBuyIn || 1000,
        currentChips: 0, // Placeholder - would need chip tracking
        sessionDuration,
        startedAt: sessionStartTime,
        status: 'active',
        isLive: true,
        sessionStartTime,
        
        // State machine properties
        sessionPhase,
        minPlayTimeCompleted,
        callTimeAvailable,
        callTimeActive,
        callTimeRemaining,
        cashOutWindowActive,
        canCashOut,
        cashOutTimeRemaining,
        
        // Table configuration
        min_play_time: minPlayTime,
        call_time_duration: callTimeDuration,
        cash_out_window: cashOutWindow,
        
        // Seat request timing
        min_play_time_minutes: minPlayTime,
        call_time_window_minutes: callTimeDuration,
        call_time_play_period_minutes: callTimeDuration,
        cashout_window_minutes: cashOutWindow,
        call_time_started: null, // TODO: Implement call time tracking
        call_time_ends: null, // TODO: Implement call time tracking
        cashout_window_ends: null, // TODO: Implement cashout window tracking
      };

      console.log('✅ [LIVE SESSION] Returning active session for player:', {
        playerId,
        tableId: table.id,
        tableName: session.tableName,
        sessionPhase,
        minPlayTimeCompleted,
        callTimeAvailable,
      });

      return {
        session,
        hasActiveSession: true,
      };
    } catch (err) {
      console.error('Get current session error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get current session');
    }
  }

  /**
   * Get session history
   */
  async getSessionHistory(
    playerId: string,
    clubId: string,
    limit: number = 20,
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

      return {
        sessions: [],
        total: 0,
        limit,
        offset,
      };
    } catch (err) {
      console.error('Get session history error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get session history');
    }
  }

  /**
   * Start call time for player at table
   */
  async startCallTime(playerId: string, clubId: string, tableId?: string) {
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
        success: true,
        message: 'Call time started',
        startedAt: new Date().toISOString(),
        tableId: tableId || null,
      };
    } catch (err) {
      console.error('Start call time error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to start call time');
    }
  }

  /**
   * Request cash out
   */
  async requestCashOut(playerId: string, clubId: string, amount?: number) {
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

      // Check KYC status
      const kycStatus = (player as any).kycStatus || 'pending';
      if (kycStatus !== 'approved' && kycStatus !== 'verified') {
        throw new ForbiddenException('Please complete KYC verification before requesting cash out');
      }

      return {
        success: true,
        message: 'Cash out request submitted',
        amount: amount || 0,
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };
    } catch (err) {
      console.error('Request cash out error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to request cash out');
    }
  }
}














