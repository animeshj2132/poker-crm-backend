import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';
import { WaitlistEntry, WaitlistStatus } from '../clubs/entities/waitlist-entry.entity';
import { Table } from '../clubs/entities/table.entity';
import { SESSION_TABLE_CHIPS_SUM_CASE_INNER } from '../clubs/entities/financial-transaction.entity';
import { EventsService } from '../events/events.service';
import { computePlayerPlaySeconds, parseTableSessionNotes } from '../utils/table-session-clock';

@Injectable()
export class PlayerPlaytimeService {
  /**
   * Parse DB timestamp-without-timezone as UTC instant.
   */
  private parseNaiveUtcDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const src = value instanceof Date ? value : new Date(value);
    if (!(src instanceof Date) || Number.isNaN(src.getTime())) return null;
    return new Date(Date.UTC(
      src.getFullYear(),
      src.getMonth(),
      src.getDate(),
      src.getHours(),
      src.getMinutes(),
      src.getSeconds(),
      src.getMilliseconds(),
    ));
  }

  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(Table)
    private readonly tablesRepo: Repository<Table>,
    private readonly clubsService: ClubsService,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService?: EventsService,
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

      const clock = parseTableSessionNotes(table.notes);
      const seatedAt = new Date(seatedEntry.seatedAt || seatedEntry.createdAt);
      const now = new Date();

      const sessionDuration = computePlayerPlaySeconds(seatedAt, clock, now, player.id);
      const sessionStartTime = new Date(now.getTime() - sessionDuration * 1000);

      const isRummyTable = table.tableType === 'RUMMY';

      let minPlayTime = 0;
      let callTimeDuration = 2;
      let cashOutWindow = 5;

      if (isRummyTable) {
        minPlayTime = 0;
        callTimeDuration = 0;
        cashOutWindow = 0;
      } else if (table.notes) {
        const noteParts = table.notes.split('|').map(p => p.trim());
        
        const minPlayMatch = noteParts.find(p => p.includes('Min Play:'));
        if (minPlayMatch) {
          const match = minPlayMatch.match(/(\d+)m/);
          if (match) {
            minPlayTime = parseInt(match[1]);
          }
        }
        
        const callTimeMatch = noteParts.find(p => p.includes('Call:'));
        if (callTimeMatch) {
          const match = callTimeMatch.match(/(\d+)m/);
          if (match) {
            callTimeDuration = parseInt(match[1]);
          }
        }
        
        const cashOutMatch = noteParts.find(p => p.includes('Cash-out:'));
        if (cashOutMatch) {
          const match = cashOutMatch.match(/(\d+)m/);
          if (match) {
            cashOutWindow = parseInt(match[1]);
          }
        }
      }

      console.log(`⏱️ [TABLE CONFIG] ${isRummyTable ? 'RUMMY (no restrictions)' : 'POKER'} - Min Play: ${minPlayTime}m, Call Time: ${callTimeDuration}m, Cash-out: ${cashOutWindow}m`);

      // Check for active buy-out request (call time)
      const buyOutRequest = await this.dataSource.query(
        `SELECT * FROM buyout_requests 
         WHERE player_id = $1 AND club_id = $2 AND status = 'pending' 
         ORDER BY created_at DESC LIMIT 1`,
        [player.id, clubId]
      );
      
      const activeBuyOutRequest = buyOutRequest && buyOutRequest.length > 0 ? buyOutRequest[0] : null;

      // Also fetch latest processed/request status so player can see rejected updates in-session.
      const seatedAtForSession = seatedEntry.seatedAt || seatedEntry.createdAt || new Date(0);
      const fromTimeForSession = new Date(seatedAtForSession);
      const latestBuyOutRequestRows = await this.dataSource.query(
        `SELECT id, status, rejection_reason, processed_at, updated_at, created_at
         FROM buyout_requests
         WHERE player_id = $1 AND club_id = $2
           AND table_number = $3
           AND created_at >= $4
         ORDER BY COALESCE(processed_at, updated_at, created_at) DESC
         LIMIT 1`,
        [player.id, clubId, seatedEntry.tableNumber, fromTimeForSession]
      );
      const latestBuyOutRequest = latestBuyOutRequestRows?.[0] || null;
      const latestBuyOutStatus = String(latestBuyOutRequest?.status || '').toLowerCase();
      const buyOutRejected = latestBuyOutStatus === 'rejected';

      // Calculate session state
      const minutesPlayed = Math.floor(sessionDuration / 60);
      
      // CRITICAL: If minPlayTime = 0, player can call time immediately after joining
      const minPlayTimeCompleted = minPlayTime === 0 ? true : minutesPlayed >= minPlayTime;
      const callTimeAvailable = minPlayTimeCompleted && !activeBuyOutRequest; // Available if min play time completed and no active request
      const callTimeActive = !!activeBuyOutRequest; // Active if there's a pending buyout request
      const cashOutWindowActive = false; // TODO: Implement cashout window tracking
      
      console.log(`⏱️ [SESSION STATE] Minutes Played: ${minutesPlayed}, Min Required: ${minPlayTime}, Can Call Time: ${callTimeAvailable}`);

      let callTimeRemaining = 0;
      let cashOutTimeRemaining = 0;
      
      // Calculate call time remaining if active
      if (callTimeActive && activeBuyOutRequest.call_time_started_at) {
        const parsedCallTime = this.parseNaiveUtcDate(activeBuyOutRequest.call_time_started_at);
        const callTimeStartedAt = parsedCallTime ? parsedCallTime.getTime() : new Date(activeBuyOutRequest.call_time_started_at).getTime();
        const now = Date.now();
        const elapsedMinutes = (now - callTimeStartedAt) / (1000 * 60);
        callTimeRemaining = Math.max(0, callTimeDuration - elapsedMinutes);
        console.log(`⏱️ [CALL TIME] Started: ${new Date(callTimeStartedAt)}, Elapsed: ${elapsedMinutes.toFixed(2)}m, Remaining: ${callTimeRemaining.toFixed(2)}m`);
      } else if (callTimeActive) {
        // If call time is active but no timestamp, default to full duration
        callTimeRemaining = callTimeDuration;
        console.log(`⏱️ [CALL TIME] Active but no timestamp, using full duration: ${callTimeDuration}m`);
      }

      let sessionPhase = callTimeActive 
        ? 'CALL TIME ACTIVE' 
        : (minPlayTimeCompleted ? 'CALL TIME AVAILABLE' : 'MINIMUM PLAY');

      const canCashOut = false; // TODO: Implement cashout logic

      // Build session object
      const callTimeStartedUtc = this.parseNaiveUtcDate(activeBuyOutRequest?.call_time_started_at);
      const buyOutProcessedUtc = this.parseNaiveUtcDate(latestBuyOutRequest?.processed_at || latestBuyOutRequest?.updated_at || null);

      // Net chips on table this session (same ledger as seated-players / hologram).
      const seatedAtForBalance = seatedEntry.seatedAt || seatedEntry.createdAt || new Date(0);
      const fromTimeForBalance =
        seatedAtForBalance instanceof Date ? seatedAtForBalance : new Date(seatedAtForBalance);
      const tableBalRows = await this.dataSource.query(
        `SELECT COALESCE(SUM(
           CASE
             ${SESSION_TABLE_CHIPS_SUM_CASE_INNER}
           END
         ), 0) as table_balance
         FROM financial_transactions
         WHERE club_id = $1
         AND player_id = $2
         AND UPPER(status) = 'COMPLETED'
         AND created_at >= $3`,
        [clubId, player.id, fromTimeForBalance],
      );
      const sessionTableChips =
        tableBalRows?.[0]?.table_balance != null
          ? Math.max(0, Number(tableBalRows[0].table_balance))
          : 0;

      const tblMin = Number((table as any).minBuyIn);
      const tblMax = Number((table as any).maxBuyIn);
      const minBuyInNum = Number.isFinite(tblMin) ? tblMin : 0;
      const maxBuyInNum = Number.isFinite(tblMax) ? tblMax : 0;
      const entryFeeNum = Number((table as any).entryFee);
      const stakesLabel =
        minBuyInNum > 0 || maxBuyInNum > 0
          ? `₹${minBuyInNum.toLocaleString('en-IN')}/₹${maxBuyInNum.toLocaleString('en-IN')}`
          : isRummyTable && Number.isFinite(entryFeeNum) && entryFeeNum > 0
            ? `Entry ₹${entryFeeNum.toLocaleString('en-IN')}`
            : '—';

      const session = {
        id: seatedEntry.id,
        playerId: player.id,
        tableId: table.id,
        tableName: `Table ${table.tableNumber}`,
        gameType: table.tableType || 'CASH',
        stakes: stakesLabel,
        minBuyIn: minBuyInNum,
        maxBuyIn: maxBuyInNum,
        buyInAmount: sessionTableChips,
        currentChips: sessionTableChips,
        sessionDuration,
        startedAt: sessionStartTime.toISOString(),
        status: 'active',
        isLive: !clock.staffPaused,
        sessionStartTime: sessionStartTime.toISOString(),
        staffSessionPaused: clock.staffPaused,
        
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
        call_time_started: callTimeStartedUtc ? callTimeStartedUtc.toISOString() : null,
        call_time_ends: callTimeStartedUtc
          ? new Date(callTimeStartedUtc.getTime() + callTimeDuration * 60 * 1000).toISOString()
          : null,
        cashout_window_active: false,
        cashout_window_ends: null,

        // Buy-out request latest status (for real-time player messaging)
        buyOutRequestId: latestBuyOutRequest?.id || null,
        buyOutStatus: latestBuyOutRequest?.status || null,
        buyOutRejected,
        buyOutRejectionReason: buyOutRejected ? (latestBuyOutRequest?.rejection_reason || null) : null,
        buyOutProcessedAt: buyOutProcessedUtc ? buyOutProcessedUtc.toISOString() : null,
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

      // Get the player's seated waitlist entry
      const seatedEntry = await this.waitlistRepo.findOne({
        where: {
          playerId: playerId,
          club: { id: clubId },
          status: WaitlistStatus.SEATED,
        },
        relations: ['club'],
      });

      if (!seatedEntry) {
        throw new BadRequestException('Player is not currently seated at a table');
      }

      let actualTableId = null;
      let minPlayTimeRequired = 0;
      let isRummyTable = false;
      
      let minutesPlayed = 0;
      if (seatedEntry.tableNumber) {
        const table = await this.tablesRepo.findOne({
          where: { club: { id: clubId }, tableNumber: seatedEntry.tableNumber },
        });
        if (table) {
          actualTableId = table.id;
          isRummyTable = table.tableType === 'RUMMY';
          
          if (!isRummyTable && table.notes) {
            const minPlayMatch = table.notes.split('|').map(p => p.trim()).find(p => p.includes('Min Play:'));
            if (minPlayMatch) {
              const match = minPlayMatch.match(/(\d+)m/);
              if (match) {
                minPlayTimeRequired = parseInt(match[1]);
              }
            }
          }

          const clock = parseTableSessionNotes(table.notes);
          const seatedAt = new Date(seatedEntry.seatedAt || seatedEntry.createdAt);
          const sessionDurationSec = computePlayerPlaySeconds(seatedAt, clock, new Date(), playerId);
          minutesPlayed = Math.floor(sessionDurationSec / 60);
        }
      }
      
      console.log(`⏱️ [CALL TIME REQUEST] Player: ${player.name}, Table: ${isRummyTable ? 'RUMMY' : 'POKER'}, Minutes Played: ${minutesPlayed}, Min Required: ${isRummyTable ? 0 : minPlayTimeRequired}`);
      
      if (!isRummyTable && minPlayTimeRequired > 0 && minutesPlayed < minPlayTimeRequired) {
        throw new BadRequestException(
          `You must play for at least ${minPlayTimeRequired} minutes before requesting call time. Time played: ${minutesPlayed} minutes, Remaining: ${minPlayTimeRequired - minutesPlayed} minutes`
        );
      }

      // Check if buy-out request already exists
      const existingRequest = await this.dataSource.query(
        `SELECT * FROM buyout_requests WHERE player_id = $1 AND club_id = $2 AND status = 'pending'`,
        [playerId, clubId]
      );

      if (existingRequest && existingRequest.length > 0) {
        throw new ConflictException('Call time already requested. Please wait for admin approval.');
      }

      // Snapshot current session table balance so buy-out review modal has accurate value.
      const seatedAt = seatedEntry.seatedAt || seatedEntry.createdAt || new Date(0);
      const fromTime = new Date(seatedAt);
      const tableBalanceResult = await this.dataSource.query(
        `SELECT COALESCE(SUM(
          CASE
            ${SESSION_TABLE_CHIPS_SUM_CASE_INNER}
          END
        ), 0) as table_balance
        FROM financial_transactions
        WHERE club_id = $1
          AND player_id = $2
          AND UPPER(status) = 'COMPLETED'
          AND created_at >= $3`,
        [clubId, playerId, fromTime]
      );
      const currentTableBalance = tableBalanceResult?.length > 0
        ? Math.max(0, Number(tableBalanceResult[0].table_balance || 0))
        : 0;

      await this.dataSource.query(
        `INSERT INTO buyout_requests 
        (club_id, player_id, table_id, table_number, seat_number, current_table_balance, status, call_time_started_at, requested_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW(), NOW(), NOW())`,
        [clubId, playerId, actualTableId, seatedEntry.tableNumber, seatedEntry.requestedSeat || seatedEntry.tableNumber, currentTableBalance]
      );

      // Emit WebSocket event to ALL staff subscribed to this club
      if (this.eventsService) {
        this.eventsService.emitBuyOutRequest(clubId, {
          player_id: playerId,
          player_name: player.name,
          table_number: seatedEntry.tableNumber,
          seat_number: seatedEntry.requestedSeat,
          current_table_balance: currentTableBalance,
          call_time_started_at: new Date().toISOString(),
          requested_at: new Date().toISOString(),
          status: 'pending',
        });
      }

      return {
        success: true,
        message: 'Call time started. Your cash-out request has been submitted to the admin.',
        startedAt: new Date().toISOString(),
        tableId: actualTableId,
      };
    } catch (err) {
      console.error('Start call time error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException ||
        err instanceof ConflictException
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














