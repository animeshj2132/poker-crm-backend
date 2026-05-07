import { Injectable, NotFoundException, BadRequestException, OnModuleInit, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';
import { EndTournamentDto } from '../dto/end-tournament.dto';
import { WALLET_BALANCE_SQL, CREDIT_BALANCE_SQL } from '../entities/financial-transaction.entity';
import { EventsService } from '../../events/events.service';

@Injectable()
export class TournamentsService implements OnModuleInit {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(forwardRef(() => EventsService)) @Optional() private readonly eventsService?: EventsService,
  ) {}

  /** Per-tournament setTimeout handles. Keyed by tournament UUID (kept for pause/resume cancellation). */
  private blindTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  onModuleInit() {
    // Primary mechanism: poll every 10 seconds, advance any tournament whose blind is overdue.
    // This is self-healing — works across restarts, pauses, manual advances, and timezone edge cases.
    setTimeout(() => this.tickBlindPoller(), 3000);
    setInterval(() => this.tickBlindPoller(), 10 * 1000);
  }

  /**
   * Runs every 10 seconds. Queries all active non-paused tournaments, calculates the
   * expected round based on elapsed wall-clock time, and advances blinds if the DB is behind.
   */
  private async tickBlindPoller(): Promise<void> {
    try {
      const rows = await this.dataSource.query(
        `SELECT id, club_id, name, status, session_started_at, paused_at, total_paused_seconds, structure
         FROM tournaments WHERE status = 'active' AND session_started_at IS NOT NULL AND paused_at IS NULL`
      );
      for (const t of rows) {
        try {
          await this.checkAndAdvanceTournamentBlind(t);
        } catch (err) {
          console.error(`[BLIND POLLER] Error checking tournament ${t.id}:`, err);
        }
      }
    } catch (err) {
      console.error('[BLIND POLLER] Query error:', err);
    }
  }

  /** Parse structure safely from either string or object. */
  private parseStructure(raw: any): any {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  }

  /**
   * Calculate what round a tournament SHOULD be at given its elapsed (non-paused) time.
   * Accounts for breaks. During a break the round stays at the level just completed;
   * it advances only when the break ends.
   */
  private calcExpectedRound(t: any, structure: any): number {
    const minutesPerLevel = Number(structure?.minutes_per_level) || 15;
    const numberOfLevels = Number(structure?.number_of_levels) || 15;
    const breakDuration = Number(structure?.break_duration) || 10;
    const breakStructureStr = String(structure?.break_structure || '');
    let breakEveryNLevels = 0;
    const bm = breakStructureStr.match(/(\d+)/);
    if (bm) breakEveryNLevels = parseInt(bm[1], 10);

    // session_started_at may come back as a JS Date or as a string — handle both
    const rawStart = t.session_started_at;
    const startMs = rawStart instanceof Date ? rawStart.getTime() : new Date(rawStart).getTime();
    const totalPausedMs = (Number(t.total_paused_seconds) || 0) * 1000;
    const effectiveElapsedMs = Date.now() - startMs - totalPausedMs;
    const effectiveElapsedMinutes = effectiveElapsedMs / 60000;

    if (effectiveElapsedMinutes <= 0) return 1;

    let accumulated = 0; // minutes accounted for so far
    for (let level = 1; level <= numberOfLevels; level++) {
      const levelEnd = accumulated + minutesPerLevel;
      if (effectiveElapsedMinutes < levelEnd) {
        return level; // still inside this level
      }
      accumulated = levelEnd;

      // Check if there is a break after this level
      if (breakEveryNLevels > 0 && level % breakEveryNLevels === 0 && level < numberOfLevels) {
        const breakEnd = accumulated + breakDuration;
        if (effectiveElapsedMinutes < breakEnd) {
          // Still inside the break — round stays at 'level', next round starts when break ends
          return level;
        }
        accumulated = breakEnd;
      }
    }

    return numberOfLevels; // past the last level
  }

  /** Check one tournament and advance blinds if the DB round is behind the expected round. */
  private async checkAndAdvanceTournamentBlind(t: any): Promise<void> {
    const structure = this.parseStructure(t.structure);
    const currentRound = Number(structure?.current_round) || 1;
    const numberOfLevels = Number(structure?.number_of_levels) || 15;

    if (currentRound >= numberOfLevels) return; // already at last level

    const expectedRound = this.calcExpectedRound(t, structure);
    if (expectedRound <= currentRound) return; // on time, nothing to do

    // Advance blinds by doubling for each skipped level (catches up if server was down/paused)
    let newRound = currentRound;
    let newSb = Number(structure.current_sb ?? structure.starting_sb) || 10;
    let newBb = Number(structure.current_bb ?? structure.starting_bb) || 20;

    while (newRound < expectedRound && newRound < numberOfLevels) {
      newSb = Math.round(newSb * 2);
      newBb = Math.round(newBb * 2);
      newRound++;
    }

    const newStructure = { ...structure, current_round: newRound, current_sb: newSb, current_bb: newBb };

    // Conditional UPDATE: only applies if another process hasn't already advanced the round
    const updateResult = await this.dataSource.query(
      `UPDATE tournaments
       SET structure = $2::jsonb, updated_at = NOW()
       WHERE id = $1
         AND (structure->>'current_round')::int = $3
       RETURNING id`,
      [t.id, JSON.stringify(newStructure), currentRound]
    );

    if (!updateResult?.length) return; // Already advanced by another process or concurrent tick

    console.log(`📈 [BLIND POLLER] "${t.name}" → Level ${newRound}: SB=${newSb} BB=${newBb}`);

    if (this.eventsService) {
      this.eventsService.emitTournamentBlindsUpdated(t.club_id, {
        id: t.id,
        name: t.name,
        currentRound: newRound,
        currentSb: newSb,
        currentBb: newBb,
        structure: newStructure,
      });
    }
  }

  /**
   * Called from startTournament / resumeTournament to schedule a precise setTimeout
   * for the next level boundary (provides sub-10s precision on top of the 10s poller).
   */
  scheduleNextBlindIncrease(tournament: any): void {
    const id: string = tournament.id;

    // Cancel any existing timer
    const existing = this.blindTimers.get(id);
    if (existing) { clearTimeout(existing); this.blindTimers.delete(id); }

    if (tournament.status !== 'active' || !tournament.session_started_at || tournament.paused_at) return;

    const structure = this.parseStructure(tournament.structure);
    const minutesPerLevel = Number(structure?.minutes_per_level) || 15;
    const numberOfLevels = Number(structure?.number_of_levels) || 15;
    const breakDuration = Number(structure?.break_duration) || 10;
    const breakStructureStr = String(structure?.break_structure || '');
    let breakEveryNLevels = 0;
    const m = breakStructureStr.match(/(\d+)/);
    if (m) breakEveryNLevels = parseInt(m[1], 10);

    const currentRound = Number(structure?.current_round) || 1;
    if (currentRound >= numberOfLevels) return;

    const rawStart = tournament.session_started_at;
    const startMs = rawStart instanceof Date ? rawStart.getTime() : new Date(rawStart).getTime();
    const totalPausedMs = (Number(tournament.total_paused_seconds) || 0) * 1000;

    let effectiveMinutesAtNextLevel = 0;
    for (let l = 1; l <= currentRound; l++) {
      effectiveMinutesAtNextLevel += minutesPerLevel;
      if (breakEveryNLevels > 0 && l % breakEveryNLevels === 0 && l < numberOfLevels) {
        effectiveMinutesAtNextLevel += breakDuration;
      }
    }

    const nextLevelAbsoluteMs = startMs + (effectiveMinutesAtNextLevel * 60 * 1000) + totalPausedMs;
    const msUntilNextLevel = nextLevelAbsoluteMs - Date.now();

    if (msUntilNextLevel <= 0) {
      // Already overdue — the 10s poller will pick this up within 10 seconds; nothing to schedule.
      console.log(`⚡ [BLIND TIMER] "${tournament.name}" level ${currentRound + 1} is overdue by ${Math.abs(Math.round(msUntilNextLevel / 1000))}s — poller will advance within 10s`);
      return;
    }

    console.log(`⏱️ [BLIND TIMER] "${tournament.name}" → Level ${currentRound + 1} in ${Math.round(msUntilNextLevel / 1000)}s`);

    const timer = setTimeout(() => {
      this.blindTimers.delete(id);
      // Let the poller pick it up; no async DB call needed here
      console.log(`🔔 [BLIND TIMER] "${tournament.name}" level boundary reached — poller will advance on next tick`);
    }, msUntilNextLevel);

    this.blindTimers.set(id, timer);
  }

  /**
   * Determine game type from tournament data (poker vs rummy)
   */
  private getGameType(tournament: any): string {
    return tournament.rummy_variant ? 'rummy' : 'poker';
  }

  /** Raw UPDATE … RETURNING * rows may omit display fields; merge identity from the row we already loaded. */
  private mergeTournamentRow(row: any, fetched: any) {
    if (!row) return row;
    return {
      ...row,
      name: row?.name ?? fetched?.name,
      rummy_variant: row?.rummy_variant ?? fetched?.rummy_variant ?? null,
    };
  }

  // Get all tournaments for a club
  async getTournaments(clubId: string) {
    const query = `
      SELECT 
        t.*,
        COUNT(DISTINCT tp.player_id) as registered_players,
        COUNT(DISTINCT tr.player_id) as registration_count
      FROM tournaments t
      LEFT JOIN tournament_players tp ON t.id = tp.tournament_id AND tp.is_active = true
      LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id AND tr.status = 'registered'
      WHERE t.club_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `;
    
    const result = await this.dataSource.query(query, [clubId]);
    return result;
  }

  // Get tournament by ID
  async getTournamentById(clubId: string, tournamentId: string) {
    const query = `
      SELECT 
        t.*,
        COUNT(DISTINCT tp.player_id) as registered_players,
        COUNT(DISTINCT tr.player_id) as registration_count
      FROM tournaments t
      LEFT JOIN tournament_players tp ON t.id = tp.tournament_id AND tp.is_active = true
      LEFT JOIN tournament_registrations tr ON t.id = tr.tournament_id AND tr.status = 'registered'
      WHERE t.club_id = $1 AND t.id = $2
      GROUP BY t.id
    `;
    
    const result = await this.dataSource.query(query, [clubId, tournamentId]);
    
    if (!result || result.length === 0) {
      throw new NotFoundException('Tournament not found');
    }
    
    return result[0];
  }

  // Create new tournament
  async createTournament(clubId: string, userId: string, dto: CreateTournamentDto) {
    // Generate tournament_id
    const countResult = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM tournaments WHERE club_id = $1',
      [clubId]
    );
    const count = parseInt(countResult[0].count) + 1;
    const tournamentId = `T${String(count).padStart(3, '0')}`;

    // Handle custom values
    const tournamentType = dto.tournament_type === 'Custom' 
      ? dto.custom_tournament_type 
      : dto.tournament_type;
    
    const blindStructure = dto.blind_structure === 'Custom'
      ? dto.custom_blind_structure
      : dto.blind_structure;

    const breakStructure = dto.break_structure === 'Custom'
      ? dto.custom_break_structure
      : dto.break_structure;

    const payoutStructure = dto.payout_structure === 'Custom'
      ? dto.custom_payout_structure
      : dto.payout_structure;

    const seatDrawMethod = dto.seat_draw_method === 'Custom'
      ? dto.custom_seat_draw_method
      : dto.seat_draw_method;

    const clockPauseRules = dto.clock_pause_rules === 'Custom'
      ? dto.custom_clock_pause_rules
      : dto.clock_pause_rules;

    // Store poker-specific fields in structure JSONB if they exist, otherwise use basic columns
    // For rummy tournaments, use basic columns + rummy fields
    const structureData = dto.rummy_variant ? null : {
      tournament_type: tournamentType,
      entry_fee: dto.entry_fee || 0,
      starting_chips: dto.starting_chips,
      blind_structure: blindStructure,
      starting_sb: dto.starting_sb,
      starting_bb: dto.starting_bb,
      number_of_levels: dto.number_of_levels || 15,
      minutes_per_level: dto.minutes_per_level || 15,
      break_structure: breakStructure,
      break_duration: dto.break_duration || 10,
      late_registration: dto.late_registration || 60,
      payout_structure: payoutStructure,
      seat_draw_method: seatDrawMethod || 'Random',
      clock_pause_rules: clockPauseRules || 'Standard',
      allow_rebuys: dto.allow_rebuys || false,
      allow_addon: dto.allow_addon || false,
      allow_reentry: dto.allow_reentry || false,
      bounty_amount: dto.bounty_amount || 0,
      prize_pool_mode: dto.prize_pool_mode || ((dto.prize_pool || 0) > 0 ? 'manual' : 'accumulated'),
    };

    const query = `
      INSERT INTO tournaments (
        club_id, name, buy_in, prize_pool, max_players, start_time, status, structure,
        rummy_variant, number_of_deals, points_per_deal, drop_points, max_points,
        deal_duration, min_players
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING *
    `;

    const startTime = dto.start_time || new Date(Date.now() + 24 * 60 * 60 * 1000);

    const values = [
      clubId,
      dto.name,
      dto.buy_in,
      dto.prize_pool_mode === 'accumulated' ? 0 : (dto.prize_pool || 0),
      dto.max_players || 100,
      startTime,
      'scheduled',
      structureData ? JSON.stringify(structureData) : null,
      dto.rummy_variant || null,
      dto.number_of_deals || null,
      dto.points_per_deal || null,
      dto.drop_points || null,
      dto.max_points || null,
      dto.deal_duration || null,
      dto.min_players || null,
    ];

    const result = await this.dataSource.query(query, values);
    return result[0];
  }

  // Update tournament
  async updateTournament(clubId: string, tournamentId: string, dto: UpdateTournamentDto) {
    // Check if tournament exists
    await this.getTournamentById(clubId, tournamentId);

    // Handle custom values
    const tournamentType = dto.tournament_type === 'Custom' 
      ? dto.custom_tournament_type 
      : dto.tournament_type;
    
    const blindStructure = dto.blind_structure === 'Custom'
      ? dto.custom_blind_structure
      : dto.blind_structure;

    const breakStructure = dto.break_structure === 'Custom'
      ? dto.custom_break_structure
      : dto.break_structure;

    const payoutStructure = dto.payout_structure === 'Custom'
      ? dto.custom_payout_structure
      : dto.payout_structure;

    const seatDrawMethod = dto.seat_draw_method === 'Custom'
      ? dto.custom_seat_draw_method
      : dto.seat_draw_method;

    const clockPauseRules = dto.clock_pause_rules === 'Custom'
      ? dto.custom_clock_pause_rules
      : dto.clock_pause_rules;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Basic tournament fields that exist as columns in the database
    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (dto.buy_in !== undefined) {
      updates.push(`buy_in = $${paramIndex++}`);
      values.push(dto.buy_in);
    }
    if (dto.prize_pool_mode === 'accumulated') {
      updates.push(`prize_pool = $${paramIndex++}`);
      values.push(0);
    } else if (dto.prize_pool !== undefined) {
      updates.push(`prize_pool = $${paramIndex++}`);
      values.push(dto.prize_pool);
    }
    if (dto.max_players !== undefined) {
      updates.push(`max_players = $${paramIndex++}`);
      values.push(dto.max_players);
    }
    if (dto.start_time !== undefined) {
      updates.push(`start_time = $${paramIndex++}`);
      values.push(dto.start_time);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(dto.status);
    }

    // Rummy-specific fields (nullable columns, so poker tournaments are unaffected)
    if (dto.rummy_variant !== undefined) {
      updates.push(`rummy_variant = $${paramIndex++}`);
      values.push(dto.rummy_variant || null);
    }
    if (dto.number_of_deals !== undefined) {
      updates.push(`number_of_deals = $${paramIndex++}`);
      values.push(dto.number_of_deals || null);
    }
    if (dto.points_per_deal !== undefined) {
      updates.push(`points_per_deal = $${paramIndex++}`);
      values.push(dto.points_per_deal || null);
    }
    if (dto.drop_points !== undefined) {
      updates.push(`drop_points = $${paramIndex++}`);
      values.push(dto.drop_points || null);
    }
    if (dto.max_points !== undefined) {
      updates.push(`max_points = $${paramIndex++}`);
      values.push(dto.max_points || null);
    }
    if (dto.deal_duration !== undefined) {
      updates.push(`deal_duration = $${paramIndex++}`);
      values.push(dto.deal_duration || null);
    }
    if (dto.min_players !== undefined) {
      updates.push(`min_players = $${paramIndex++}`);
      values.push(dto.min_players || null);
    }
    // Handle poker-specific fields in structure JSONB column
    const hasPokerFields = tournamentType || dto.entry_fee !== undefined || dto.starting_chips !== undefined || 
                          blindStructure || dto.starting_sb !== undefined || dto.starting_bb !== undefined ||
                          dto.number_of_levels !== undefined || dto.minutes_per_level !== undefined ||
                          breakStructure || dto.break_duration !== undefined || dto.late_registration !== undefined ||
                          payoutStructure || seatDrawMethod || clockPauseRules ||
                          dto.allow_rebuys !== undefined || dto.allow_addon !== undefined || 
                          dto.allow_reentry !== undefined || dto.bounty_amount !== undefined ||
                          dto.prize_pool_mode !== undefined;

    if (hasPokerFields && !dto.rummy_variant) {
      // Get existing tournament to merge with existing structure
      const tournament = await this.getTournamentById(clubId, tournamentId);
      const existingStructure = tournament.structure || {};
      
      const structureData = {
        ...existingStructure,
        tournament_type: tournamentType || existingStructure.tournament_type,
        entry_fee: dto.entry_fee !== undefined ? dto.entry_fee : existingStructure.entry_fee,
        starting_chips: dto.starting_chips !== undefined ? dto.starting_chips : existingStructure.starting_chips,
        blind_structure: blindStructure || existingStructure.blind_structure,
        starting_sb: dto.starting_sb !== undefined ? dto.starting_sb : existingStructure.starting_sb,
        starting_bb: dto.starting_bb !== undefined ? dto.starting_bb : existingStructure.starting_bb,
        number_of_levels: dto.number_of_levels !== undefined ? dto.number_of_levels : existingStructure.number_of_levels,
        minutes_per_level: dto.minutes_per_level !== undefined ? dto.minutes_per_level : existingStructure.minutes_per_level,
        break_structure: breakStructure || existingStructure.break_structure,
        break_duration: dto.break_duration !== undefined ? dto.break_duration : existingStructure.break_duration,
        late_registration: dto.late_registration !== undefined ? dto.late_registration : existingStructure.late_registration,
        payout_structure: payoutStructure || existingStructure.payout_structure,
        seat_draw_method: seatDrawMethod || existingStructure.seat_draw_method,
        clock_pause_rules: clockPauseRules || existingStructure.clock_pause_rules,
        allow_rebuys: dto.allow_rebuys !== undefined ? dto.allow_rebuys : existingStructure.allow_rebuys,
        allow_addon: dto.allow_addon !== undefined ? dto.allow_addon : existingStructure.allow_addon,
        allow_reentry: dto.allow_reentry !== undefined ? dto.allow_reentry : existingStructure.allow_reentry,
        bounty_amount: dto.bounty_amount !== undefined ? dto.bounty_amount : existingStructure.bounty_amount,
        prize_pool_mode:
          dto.prize_pool_mode !== undefined ? dto.prize_pool_mode : existingStructure.prize_pool_mode,
      };

      updates.push(`structure = $${paramIndex++}`);
      values.push(JSON.stringify(structureData));
    }

    if (updates.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(clubId, tournamentId);

    const query = `
      UPDATE tournaments 
      SET ${updates.join(', ')}
      WHERE club_id = $${paramIndex++} AND id = $${paramIndex++}
      RETURNING *
    `;

    const result = await this.dataSource.query(query, values);
    return result[0];
  }

  // Delete tournament
  async deleteTournament(clubId: string, tournamentId: string) {
    // Check if tournament exists
    const tournament = await this.getTournamentById(clubId, tournamentId);

    // Check tournament status - only refund if tournament hasn't started yet
    const shouldRefund = !['active', 'completed', 'ended', 'finished'].includes(tournament.status?.toLowerCase() || '');
    
    console.log(`🏆 [TOURNAMENT DELETE] Tournament status: ${tournament.status}, Should refund: ${shouldRefund}`);

    // Use transaction to ensure atomicity (refund players + delete tournament)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let playersRefunded = 0;
      let totalRefunded = 0;

      // Only refund if tournament hasn't started yet (scheduled, upcoming, registration_open)
      if (shouldRefund) {
        // Get all registered players for refund
        const registeredPlayers = await queryRunner.query(
          `SELECT tr.player_id, p.name as player_name
           FROM tournament_registrations tr
           INNER JOIN players p ON p.id = tr.player_id
           WHERE tr.tournament_id = $1 AND tr.club_id = $2`,
          [tournamentId, clubId]
        );

        console.log(`🏆 [TOURNAMENT DELETE] Refunding ${registeredPlayers.length} registered players`);

        // Refund registration fee to all registered players
        if (registeredPlayers.length > 0 && tournament.buy_in > 0) {
          const buyInAmount = parseFloat(tournament.buy_in);
          
          for (const participant of registeredPlayers) {
            console.log(`💰 [TOURNAMENT DELETE] Refunding ₹${buyInAmount} to player ${participant.player_id} (${participant.player_name})`);
            
            // Create refund transaction with correct game type
            const gameType = this.getGameType(tournament);
            await queryRunner.query(`
              INSERT INTO financial_transactions (
                club_id, player_id, player_name, type, amount, status, game_type, notes, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            `, [
              clubId,
              participant.player_id,
              participant.player_name || 'Unknown Player',
              'Refund',
              buyInAmount,
              'Completed',
              gameType,
              `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Tournament Cancelled - Refund: ${tournament.name} (ID: ${tournamentId})`
            ]);
          }

          playersRefunded = registeredPlayers.length;
          totalRefunded = registeredPlayers.length * buyInAmount;
          console.log(`💰 [TOURNAMENT DELETE] All refunds completed`);
        }
      } else {
        console.log(`🏆 [TOURNAMENT DELETE] No refunds - tournament already started/ended (status: ${tournament.status})`);
      }

      // Delete tournament registrations first (foreign key constraint)
      await queryRunner.query(
        `DELETE FROM tournament_registrations WHERE tournament_id = $1 AND club_id = $2`,
        [tournamentId, clubId]
      );

      // Delete tournament
      await queryRunner.query(
        `DELETE FROM tournaments WHERE club_id = $1 AND id = $2`,
        [clubId, tournamentId]
      );

      await queryRunner.commitTransaction();

      const refundMessage = shouldRefund && playersRefunded > 0 
        ? ` Refunded ₹${parseFloat(tournament.buy_in).toLocaleString()} to ${playersRefunded} player(s).`
        : shouldRefund 
          ? ' No registered players to refund.'
          : ' No refunds issued (tournament already started/completed).';

      return { 
        message: `Tournament deleted successfully.${refundMessage}`,
        playersRefunded: playersRefunded,
        totalRefunded: totalRefunded,
        tournamentStatus: tournament.status
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('Error deleting tournament:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Start tournament
  async startTournament(clubId: string, tournamentId: string) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status === 'active') {
      throw new BadRequestException('Tournament is already active');
    }

    if (tournament.status === 'completed') {
      throw new BadRequestException('Cannot start a completed tournament');
    }

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get all registered players
      const registeredPlayers = await queryRunner.query(
        `SELECT tr.player_id, p.name as player_name
         FROM tournament_registrations tr
         INNER JOIN players p ON p.id = tr.player_id
         WHERE tr.tournament_id = $1 AND tr.status = 'registered'`,
        [tournamentId]
      );

      const buyInAmount = parseFloat(tournament.buy_in) || 0;
      const sessionStartedAt = new Date().toISOString();
      console.log(`🏆 [TOURNAMENT START] Moving ${registeredPlayers.length} players to tournament_players (buy-in already deducted at registration)`);

      // Merge blind state into structure for active tournament (current_round, current_sb, current_bb)
      let structure = tournament.structure;
      if (typeof structure === 'string') {
        try { structure = JSON.parse(structure); } catch { structure = {}; }
      }
      structure = { ...(structure || {}), current_round: 1, current_sb: structure?.starting_sb ?? 25, current_bb: structure?.starting_bb ?? 50 };

      // Update tournament status to active, session start time, and blind state
      const result = await queryRunner.query(
        `UPDATE tournaments 
         SET status = 'active', session_started_at = $3, structure = $4::jsonb, updated_at = NOW()
         WHERE club_id = $1 AND id = $2
         RETURNING *`,
        [clubId, tournamentId, sessionStartedAt, JSON.stringify(structure)]
      );

      // Set session_started_at on existing tournament_players
      await queryRunner.query(
        `UPDATE tournament_players 
         SET session_started_at = $2, is_exited = false
         WHERE tournament_id = $1`,
        [tournamentId, sessionStartedAt]
      );

      // Copy tournament_registrations into tournament_players with total_invested = buy_in
      await queryRunner.query(
        `INSERT INTO tournament_players (tournament_id, player_id, is_active, session_started_at, is_exited, total_invested)
         SELECT tr.tournament_id, tr.player_id, true, $2, false, $3
         FROM tournament_registrations tr
         WHERE tr.tournament_id = $1 AND tr.status = 'registered'
         ON CONFLICT (tournament_id, player_id) DO UPDATE SET 
           session_started_at = $2, is_active = true, is_exited = false,
           total_invested = COALESCE(tournament_players.total_invested, 0) + $3`,
        [tournamentId, sessionStartedAt, buyInAmount]
      );

      await queryRunner.commitTransaction();

      console.log(`✅ [TOURNAMENT START] Tournament ${tournament.name} started successfully`);
      const started = this.mergeTournamentRow(result[0], tournament);
      // Schedule precise blind increases from the first level boundary
      this.scheduleNextBlindIncrease({ ...started, structure: JSON.parse(JSON.stringify(structure)) });
      if (this.eventsService) {
        this.eventsService.emitTournamentUpdated(clubId);
        this.eventsService.notifyTournamentActivePlayersFcm(
          clubId,
          tournamentId,
          'Tournament started',
          `${tournament.name} has started. Good luck!`,
          { type: 'tournament_start' },
        );
      }
      return started;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ [TOURNAMENT START] Error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Pause an active tournament
  async pauseTournament(clubId: string, tournamentId: string) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Only active tournaments can be paused');
    }

    if (tournament.paused_at) {
      throw new BadRequestException('Tournament is already paused');
    }

    const pausedAt = new Date().toISOString();

    const result = await this.dataSource.query(
      `UPDATE tournaments 
       SET paused_at = $3, updated_at = NOW()
       WHERE club_id = $1 AND id = $2
       RETURNING *`,
      [clubId, tournamentId, pausedAt]
    );

    // Cancel the scheduled blind timer — time is frozen while paused
    const existing = this.blindTimers.get(tournamentId);
    if (existing) { clearTimeout(existing); this.blindTimers.delete(tournamentId); }

    console.log(`⏸️ [TOURNAMENT PAUSE] Tournament ${tournament.name} paused (blind timer cancelled)`);
    if (this.eventsService) {
      this.eventsService.emitTournamentUpdated(clubId);
      this.eventsService.notifyTournamentActivePlayersFcm(
        clubId,
        tournamentId,
        'Tournament paused',
        `${tournament.name} is paused.`,
        { type: 'tournament_pause' },
      );
    }
    return this.mergeTournamentRow(result[0], tournament);
  }

  // Resume a paused tournament
  async resumeTournament(clubId: string, tournamentId: string) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Only active tournaments can be resumed');
    }

    if (!tournament.paused_at) {
      throw new BadRequestException('Tournament is not paused');
    }

    // Calculate how long it was paused
    const pausedAt = new Date(tournament.paused_at).getTime();
    const now = Date.now();
    const pausedSeconds = Math.floor((now - pausedAt) / 1000);
    const currentTotalPaused = parseInt(tournament.total_paused_seconds) || 0;
    const newTotalPaused = currentTotalPaused + pausedSeconds;

    const result = await this.dataSource.query(
      `UPDATE tournaments 
       SET paused_at = NULL, total_paused_seconds = $3, updated_at = NOW()
       WHERE club_id = $1 AND id = $2
       RETURNING *`,
      [clubId, tournamentId, newTotalPaused]
    );

    const resumed = result[0];
    // Reschedule blind timer now that the clock is running again (with updated total_paused_seconds)
    this.scheduleNextBlindIncrease(resumed);

    console.log(`▶️ [TOURNAMENT RESUME] Tournament ${tournament.name} resumed (was paused ${pausedSeconds}s, total paused: ${newTotalPaused}s) — blind timer rescheduled`);
    if (this.eventsService) {
      this.eventsService.emitTournamentUpdated(clubId);
      this.eventsService.notifyTournamentActivePlayersFcm(
        clubId,
        tournamentId,
        'Tournament resumed',
        `${tournament.name} is live again.`,
        { type: 'tournament_resume' },
      );
    }
    return this.mergeTournamentRow(resumed, tournament);
  }

  // Stop/End a tournament without winners (forced stop)
  async stopTournament(clubId: string, tournamentId: string) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Only active tournaments can be stopped');
    }

    // Update status to completed
    const result = await this.dataSource.query(
      `UPDATE tournaments 
       SET status = 'completed', paused_at = NULL, updated_at = NOW()
       WHERE club_id = $1 AND id = $2
       RETURNING *`,
      [clubId, tournamentId]
    );

    if (this.eventsService) {
      this.eventsService.notifyTournamentActivePlayersFcm(
        clubId,
        tournamentId,
        'Tournament stopped',
        `${tournament.name} was ended by staff.`,
        { type: 'tournament_stop' },
      );
    }

    // Mark all active players as inactive
    await this.dataSource.query(
      `UPDATE tournament_players 
       SET is_active = false
       WHERE tournament_id = $1 AND is_active = true`,
      [tournamentId]
    );

    const stopped = this.blindTimers.get(tournamentId);
    if (stopped) { clearTimeout(stopped); this.blindTimers.delete(tournamentId); }

    console.log(`🛑 [TOURNAMENT STOP] Tournament ${tournament.name} stopped (forced end without winners)`);
    if (this.eventsService) this.eventsService.emitTournamentUpdated(clubId);
    return this.mergeTournamentRow(result[0], tournament);
  }

  // End tournament with winners
  async endTournament(clubId: string, tournamentId: string, dto: EndTournamentDto) {
    const tournament = await this.getTournamentById(clubId, tournamentId);
    const rawWinners = Array.isArray(dto?.winners) ? dto.winners : [];

    if (rawWinners.length === 0) {
      throw new BadRequestException('At least one winner is required');
    }

    const winners = rawWinners.map((winner) => ({
      player_id: String(winner.player_id || '').trim(),
      finishing_position: Number(winner.finishing_position),
      prize_amount: Number(winner.prize_amount),
    }));

    for (const winner of winners) {
      if (!winner.player_id) {
        throw new BadRequestException('Winner player_id is required');
      }
      if (!Number.isInteger(winner.finishing_position) || winner.finishing_position <= 0) {
        throw new BadRequestException(`Invalid finishing position for player ${winner.player_id}`);
      }
      if (!Number.isFinite(winner.prize_amount) || winner.prize_amount < 0) {
        throw new BadRequestException(`Invalid prize amount for player ${winner.player_id}`);
      }
    }

    const uniquePlayers = new Set(winners.map((w) => w.player_id));
    if (uniquePlayers.size !== winners.length) {
      throw new BadRequestException('Same player cannot be assigned multiple finishing positions');
    }

    const uniquePositions = new Set(winners.map((w) => w.finishing_position));
    if (uniquePositions.size !== winners.length) {
      throw new BadRequestException('Each finishing position must be unique');
    }

    const participantRows = await this.dataSource.query(
      `SELECT DISTINCT tp.player_id::text AS player_id
       FROM tournament_players tp
       WHERE tp.tournament_id = $1
         AND tp.player_id = ANY($2::uuid[])`,
      [tournamentId, winners.map((w) => w.player_id)]
    );
    const participantSet = new Set((participantRows || []).map((r: any) => String(r.player_id)));
    const missingParticipants = winners
      .map((w) => w.player_id)
      .filter((playerId) => !participantSet.has(playerId));
    if (missingParticipants.length > 0) {
      throw new BadRequestException('All winners must be registered in this tournament');
    }

    if (tournament.status !== 'active') {
      throw new BadRequestException('Only active tournaments can be ended');
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Acquire pessimistic row lock, then recheck status inside the transaction.
      // The explicit FOR UPDATE lock ensures two concurrent calls serialize at the DB level.
      // The status recheck after locking prevents double-ending the tournament.
      const locked = await queryRunner.query(
        `SELECT status FROM tournaments WHERE club_id = $1 AND id = $2 FOR UPDATE`,
        [clubId, tournamentId]
      );
      if (!locked || locked.length === 0) {
        throw new NotFoundException('Tournament not found');
      }
      if (locked[0].status !== 'active') {
        throw new BadRequestException('Only active tournaments can be ended');
      }

      // Step 2: Update status (safe — row is locked from above)
      await queryRunner.query(
        `UPDATE tournaments SET status = 'completed', updated_at = NOW()
         WHERE club_id = $1 AND id = $2`,
        [clubId, tournamentId]
      );

      const gameType = this.getGameType(tournament);
      const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);

      // Update winners in tournament_players table and player balances
      for (const winner of winners) {
        // Get player name for the transaction
        const playerResult = await queryRunner.query(
          `SELECT name FROM players WHERE id = $1 AND club_id = $2`,
          [winner.player_id, clubId]
        );
        const playerName = playerResult?.[0]?.name || 'Unknown Player';

        // Update tournament_players
        await queryRunner.query(
          `INSERT INTO tournament_players 
           (tournament_id, player_id, finishing_position, prize_amount, is_active)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT (tournament_id, player_id) 
           DO UPDATE SET 
             finishing_position = $3,
             prize_amount = $4,
             is_active = false`,
          [tournamentId, winner.player_id, winner.finishing_position, winner.prize_amount]
        );

        if (winner.prize_amount > 0) {
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes)
             VALUES ($1, $2, $3, $4, 'Tournament Win', 'Completed', $5, $6)`,
            [
              clubId,
              winner.player_id,
              playerName,
              winner.prize_amount,
              gameType,
              `${gameLabel} Tournament Prize - ${tournament.name} - Position #${winner.finishing_position} (₹${Number(winner.prize_amount).toLocaleString()})`
            ]
          );
        }
      }

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitTournamentUpdated(clubId);
        const pRows = await this.dataSource.query(
          `SELECT DISTINCT player_id::text AS pid FROM tournament_players WHERE tournament_id = $1`,
          [tournamentId],
        );
        for (const pr of pRows) {
          if (!pr?.pid) continue;
          void this.eventsService.sendFcmPush(
            pr.pid,
            'Tournament finished',
            `${tournament.name} has ended. See your results in the app.`,
            { clubId, tournamentId, type: 'tournament_end' },
          );
        }
      }

      // Return updated tournament
      return await this.getTournamentById(clubId, tournamentId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Get tournament players/registrations
  async getTournamentPlayers(clubId: string, tournamentId: string) {
    // Verify tournament exists
    const tournament = await this.getTournamentById(clubId, tournamentId);

    // First try tournament_players table - include balance info
    const query1 = `
      SELECT 
        p.id,
        p.player_id,
        p.name,
        p.email,
        p.phone_number as mobile,
        tp.registered_at,
        tp.seat_number,
        tp.table_number,
        tp.finishing_position,
        tp.prize_amount,
        tp.is_active,
        tp.session_started_at,
        tp.is_exited,
        tp.exited_at,
        tp.exit_balance,
        tp.rebuy_count,
        tp.addon_count,
        tp.total_invested,
        'registered' as registration_status,
        COALESCE((
          SELECT ${WALLET_BALANCE_SQL}
          FROM financial_transactions ft 
          WHERE ft.club_id = $2 AND ft.player_id = p.id::text AND UPPER(ft.status) = 'COMPLETED'
        ), 0) as wallet_balance,
        COALESCE((
          SELECT SUM(ft.amount) FROM financial_transactions ft 
          WHERE ft.club_id = $2 AND ft.player_id = p.id::text AND UPPER(ft.status) = 'COMPLETED' AND UPPER(ft.type) = 'CREDIT'
        ), 0) as total_credits
      FROM tournament_players tp
      INNER JOIN players p ON p.id = tp.player_id
      WHERE tp.tournament_id = $1 AND p.club_id = $2
      ORDER BY 
        CASE WHEN tp.is_exited THEN 1 ELSE 0 END,
        CASE WHEN tp.finishing_position IS NOT NULL THEN tp.finishing_position ELSE 9999 END,
        tp.registered_at DESC
    `;

    let result = await this.dataSource.query(query1, [tournamentId, clubId]);
    
    // If no results, try tournament_registrations table
    if (!result || result.length === 0) {
      const query2 = `
        SELECT 
          p.id,
          p.player_id,
          p.name,
          p.email,
          p.phone_number as mobile,
          tr.registered_at,
          NULL as seat_number,
          NULL as table_number,
          NULL as finishing_position,
          NULL as prize_amount,
          true as is_active,
          NULL as session_started_at,
          false as is_exited,
          NULL as exited_at,
          0 as exit_balance,
          tr.status as registration_status,
          COALESCE((
            SELECT ${WALLET_BALANCE_SQL}
            FROM financial_transactions ft 
            WHERE ft.club_id = $2 AND ft.player_id = p.id::text AND UPPER(ft.status) = 'COMPLETED'
          ), 0) as wallet_balance,
          COALESCE((
            SELECT SUM(ft.amount) FROM financial_transactions ft 
            WHERE ft.club_id = $2 AND ft.player_id = p.id::text AND UPPER(ft.status) = 'COMPLETED' AND UPPER(ft.type) = 'CREDIT'
          ), 0) as total_credits
        FROM tournament_registrations tr
        INNER JOIN players p ON p.id = tr.player_id
        WHERE tr.tournament_id = $1 AND p.club_id = $2
        ORDER BY tr.registered_at DESC
      `;
      result = await this.dataSource.query(query2, [tournamentId, clubId]);
    }

    return result || [];
  }

  // Get tournament winners
  async getTournamentWinners(clubId: string, tournamentId: string) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'completed') {
      throw new BadRequestException('Tournament is not completed yet');
    }

    const query = `
      SELECT 
        p.id,
        p.player_id,
        p.name,
        p.email,
        tp.finishing_position,
        tp.prize_amount
      FROM tournament_players tp
      JOIN players p ON tp.player_id = p.id
      WHERE tp.tournament_id = $1 
        AND tp.finishing_position IS NOT NULL
        AND tp.prize_amount > 0
      ORDER BY tp.finishing_position ASC
    `;

    const result = await this.dataSource.query(query, [tournamentId]);
    return result;
  }

  // Exit a player from an active tournament
  async exitTournamentPlayer(
    clubId: string,
    tournamentId: string,
    playerId: string,
    exitBalance: number = 0,
    notes?: string,
  ) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Can only exit players from active tournaments');
    }

    // Resolve playerId: accept either UUID (players.id) or display id (players.player_id)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let resolvedPlayerId = playerId?.trim();
    if (!resolvedPlayerId) {
      throw new BadRequestException('Player ID is required');
    }
    if (!uuidRegex.test(resolvedPlayerId)) {
      const byDisplayId = await this.dataSource.query(
        `SELECT id FROM players WHERE club_id = $1 AND (player_id = $2 OR name = $2) LIMIT 1`,
        [clubId, resolvedPlayerId]
      );
      if (!byDisplayId?.length) {
        throw new NotFoundException('Player not found in this tournament');
      }
      resolvedPlayerId = byDisplayId[0].id;
    }

    // Check player is in the tournament and not already exited
    let playerCheckResult = await this.dataSource.query(
      `SELECT tp.*, p.name as player_name 
       FROM tournament_players tp
       INNER JOIN players p ON p.id = tp.player_id
       WHERE tp.tournament_id = $1 AND tp.player_id = $2`,
      [tournamentId, resolvedPlayerId]
    );

    if (!playerCheckResult || playerCheckResult.length === 0) {
      // Fallback: check tournament_registrations (player registered but not yet in tournament_players)
      const regCheck = await this.dataSource.query(
        `SELECT tr.*, p.name as player_name
         FROM tournament_registrations tr
         INNER JOIN players p ON p.id = tr.player_id
         WHERE tr.tournament_id = $1 AND tr.player_id = $2 AND tr.status = 'registered'`,
        [tournamentId, resolvedPlayerId]
      );
      if (!regCheck || regCheck.length === 0) {
        throw new NotFoundException('Player not found in this tournament');
      }
      // Auto-enroll into tournament_players so exit can proceed
      const sessionStartedAt = tournament.session_started_at
        ? new Date(tournament.session_started_at).toISOString()
        : new Date().toISOString();
      await this.dataSource.query(
        `INSERT INTO tournament_players (tournament_id, player_id, is_active, session_started_at, is_exited, total_invested)
         VALUES ($1, $2, true, $3, false, $4)
         ON CONFLICT (tournament_id, player_id) DO UPDATE SET
           is_active = true, is_exited = false,
           session_started_at = COALESCE(tournament_players.session_started_at, $3),
           total_invested = COALESCE(tournament_players.total_invested, 0) + $4`,
        [tournamentId, resolvedPlayerId, sessionStartedAt, parseFloat(tournament.buy_in) || 0]
      );
      playerCheckResult = await this.dataSource.query(
        `SELECT tp.*, p.name as player_name 
         FROM tournament_players tp
         INNER JOIN players p ON p.id = tp.player_id
         WHERE tp.tournament_id = $1 AND tp.player_id = $2`,
        [tournamentId, resolvedPlayerId]
      );
    }

    const playerEntry = playerCheckResult[0];
    if (playerEntry.is_exited) {
      throw new BadRequestException('Player has already exited this tournament');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const exitedAt = new Date().toISOString();

      // Mark player as exited in tournament_players (clear session_started_at to end their session)
      await queryRunner.query(
        `UPDATE tournament_players 
         SET is_exited = true, exited_at = $3, exit_balance = $4, is_active = false, session_started_at = NULL
         WHERE tournament_id = $1 AND player_id = $2`,
        [tournamentId, resolvedPlayerId, exitedAt, exitBalance]
      );

      const gameType = this.getGameType(tournament);
      const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);

      if (exitBalance > 0) {
        // Get outstanding credit for this player
        const creditResult = await queryRunner.query(
          `SELECT ${CREDIT_BALANCE_SQL} as credit_owed FROM financial_transactions WHERE club_id = $1 AND player_id = $2::text AND UPPER(status) = 'COMPLETED'`,
          [clubId, resolvedPlayerId]
        );
        const creditOwed = Math.max(0, Number(creditResult[0]?.credit_owed || 0));

        // Refund exit balance to wallet
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes)
           VALUES ($1, $2, $3, $4, 'Refund', 'Completed', $6, $5)`,
          [clubId, resolvedPlayerId, playerEntry.player_name, exitBalance, notes || `${gameLabel} Tournament exit - ${tournament.name}`, gameType]
        );

        // Settle credit if any outstanding
        if (creditOwed > 0) {
          const debitAmount = Math.min(creditOwed, exitBalance);
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes)
             VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $6, $5)`,
            [clubId, resolvedPlayerId, playerEntry.player_name, debitAmount, `Credit settlement from ${gameLabel} tournament - ${tournament.name}`, gameType]
          );
          console.log(`💰 [TOURNAMENT EXIT] Settled ₹${debitAmount} credit for ${playerEntry.player_name}`);
        }

        console.log(`💰 [TOURNAMENT EXIT] Refunded ₹${exitBalance} to player ${playerEntry.player_name}`);
      } else {
        // Player went bust but still needs to settle credit
        const creditResult = await queryRunner.query(
          `SELECT ${CREDIT_BALANCE_SQL} as credit_owed FROM financial_transactions WHERE club_id = $1 AND player_id = $2::text AND UPPER(status) = 'COMPLETED'`,
          [clubId, resolvedPlayerId]
        );
        const creditOwed = Math.max(0, Number(creditResult[0]?.credit_owed || 0));

        if (creditOwed > 0) {
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes)
             VALUES ($1, $2, $3, $4, 'Debit', 'Completed', $6, $5)`,
            [clubId, resolvedPlayerId, playerEntry.player_name, creditOwed, `Credit settlement (bust) from ${gameLabel} tournament - ${tournament.name}`, gameType]
          );
          console.log(`💰 [TOURNAMENT EXIT] Settled ₹${creditOwed} credit for bust player ${playerEntry.player_name}`);
        }

        console.log(`🔴 [TOURNAMENT EXIT] Player ${playerEntry.player_name} exited with ₹0 (bust)`);
      }

      await queryRunner.commitTransaction();

      if (this.eventsService) {
        this.eventsService.emitTournamentUpdated(clubId);
        this.eventsService.emitTournamentPlayerUpdated(clubId, String(resolvedPlayerId));
        // Exit may post refund / credit settlement — refresh wallets everywhere
        this.eventsService.emitTransactionCreated(clubId, String(resolvedPlayerId));
        this.eventsService.emitBalanceUpdated(clubId, String(resolvedPlayerId));
        void this.eventsService.sendFcmPush(
          String(resolvedPlayerId),
          'Tournament exit',
          `You left "${tournament.name}". Check your wallet for any refund.`,
          { clubId, tournamentId, type: 'tournament_exit' },
        );
      }

      return {
        success: true,
        message: `Player ${playerEntry.player_name} exited tournament${exitBalance > 0 ? ` with ₹${exitBalance}` : ' (bust)'}`,
        exitBalance,
        exitedAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ [TOURNAMENT EXIT] Error:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Rebuy / Re-entry for an exited player
  async rebuyTournamentPlayer(
    clubId: string,
    tournamentId: string,
    playerId: string,
    type: 'rebuy' | 'reentry' | 'addon' = 'rebuy',
    customAmount?: number,
  ) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Tournament is not active');
    }

    // Parse tournament structure for settings
    let structure = tournament.structure || {};
    if (typeof structure === 'string') {
      try { structure = JSON.parse(structure); } catch { structure = {}; }
    }

    const allowRebuys = structure.allow_rebuys || tournament.allow_rebuys || false;
    const allowReentry = structure.allow_reentry || tournament.allow_reentry || false;
    const allowAddon = structure.allow_addon || tournament.allow_addon || false;
    const lateRegistrationMinutes = structure.late_registration || 0;
    const buyInAmount = (type === 'addon' && customAmount != null && customAmount > 0)
      ? customAmount
      : (parseFloat(tournament.buy_in) || 0);

    // Validate permission
    if (type === 'rebuy' && !allowRebuys) {
      throw new BadRequestException('Rebuys are not allowed in this tournament');
    }
    if (type === 'reentry' && !allowReentry) {
      throw new BadRequestException('Re-entry is not allowed in this tournament');
    }
    if (type === 'addon' && !allowAddon) {
      throw new BadRequestException('Add-ons are not allowed in this tournament');
    }

    // Check late registration window for re-entry
    if (type === 'reentry' && lateRegistrationMinutes > 0 && tournament.session_started_at) {
      const sessionStart = new Date(tournament.session_started_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - sessionStart) / (1000 * 60);
      if (elapsedMinutes > lateRegistrationMinutes) {
        throw new BadRequestException(`Late registration/re-entry window has closed (${lateRegistrationMinutes} minutes)`);
      }
    }

    // Check player exists
    let playerCheckResult = await this.dataSource.query(
      `SELECT tp.*, p.name as player_name 
       FROM tournament_players tp
       INNER JOIN players p ON p.id = tp.player_id
       WHERE tp.tournament_id = $1 AND tp.player_id = $2`,
      [tournamentId, playerId]
    );

    if (!playerCheckResult || playerCheckResult.length === 0) {
      // Fallback: check tournament_registrations
      const regCheck = await this.dataSource.query(
        `SELECT tr.*, p.name as player_name
         FROM tournament_registrations tr
         INNER JOIN players p ON p.id = tr.player_id
         WHERE tr.tournament_id = $1 AND tr.player_id = $2 AND tr.status = 'registered'`,
        [tournamentId, playerId]
      );
      if (!regCheck || regCheck.length === 0) {
        throw new NotFoundException('Player not found in this tournament');
      }
      const sessionStartedAt = tournament.session_started_at
        ? new Date(tournament.session_started_at).toISOString()
        : new Date().toISOString();
      await this.dataSource.query(
        `INSERT INTO tournament_players (tournament_id, player_id, is_active, session_started_at, is_exited, total_invested)
         VALUES ($1, $2, true, $3, false, $4)
         ON CONFLICT (tournament_id, player_id) DO UPDATE SET
           is_active = true, is_exited = false,
           session_started_at = COALESCE(tournament_players.session_started_at, $3),
           total_invested = COALESCE(tournament_players.total_invested, 0) + $4`,
        [tournamentId, playerId, sessionStartedAt, parseFloat(tournament.buy_in) || 0]
      );
      playerCheckResult = await this.dataSource.query(
        `SELECT tp.*, p.name as player_name 
         FROM tournament_players tp
         INNER JOIN players p ON p.id = tp.player_id
         WHERE tp.tournament_id = $1 AND tp.player_id = $2`,
        [tournamentId, playerId]
      );
    }

    const playerEntry = playerCheckResult[0];

    // For rebuy/reentry, player must be exited
    if ((type === 'rebuy' || type === 'reentry') && !playerEntry.is_exited) {
      throw new BadRequestException('Player must be exited to rebuy or re-enter');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const gameType = this.getGameType(tournament);
      const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);
      if (buyInAmount > 0) {
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes)
           VALUES ($1, $2, $3, $4, 'Buy In', 'Completed', $6, $5)`,
          [
            clubId,
            playerId,
            playerEntry.player_name,
            buyInAmount,
            `${gameLabel} Tournament ${type} - ${tournament.name}`,
            gameType
          ]
        );
      }

      // Update tournament_players
      if (type === 'rebuy') {
        // Rebuy: resume session — keep original session_started_at
        await queryRunner.query(
          `UPDATE tournament_players 
           SET is_exited = false, is_active = true, exited_at = NULL, exit_balance = 0,
               rebuy_count = rebuy_count + 1,
               total_invested = COALESCE(total_invested, 0) + $3
           WHERE tournament_id = $1 AND player_id = $2`,
          [tournamentId, playerId, buyInAmount]
        );
      } else if (type === 'reentry') {
        // Re-entry: restart session from 0
        await queryRunner.query(
          `UPDATE tournament_players 
           SET is_exited = false, is_active = true, exited_at = NULL, exit_balance = 0,
               rebuy_count = rebuy_count + 1,
               total_invested = COALESCE(total_invested, 0) + $3,
               session_started_at = $4
           WHERE tournament_id = $1 AND player_id = $2`,
          [tournamentId, playerId, buyInAmount, new Date().toISOString()]
        );
      } else {
        // Addon - player stays in, just add chips investment
        await queryRunner.query(
          `UPDATE tournament_players 
           SET addon_count = addon_count + 1,
               total_invested = COALESCE(total_invested, 0) + $3
           WHERE tournament_id = $1 AND player_id = $2`,
          [tournamentId, playerId, buyInAmount]
        );
      }

      await queryRunner.commitTransaction();

      const actionLabel = type === 'rebuy' ? 'Rebuy' : type === 'reentry' ? 'Re-entry' : 'Add-on';
      console.log(`🔄 [TOURNAMENT ${actionLabel.toUpperCase()}] Player ${playerEntry.player_name} - ₹${buyInAmount}`);

      if (this.eventsService) {
        this.eventsService.emitTournamentUpdated(clubId);
        this.eventsService.emitTournamentPlayerUpdated(clubId, String(playerId));
        if (buyInAmount > 0) {
          this.eventsService.emitTransactionCreated(clubId, String(playerId));
          this.eventsService.emitBalanceUpdated(clubId, String(playerId));
        }
      }

      return {
        success: true,
        message: `${actionLabel} successful for ${playerEntry.player_name} (₹${buyInAmount})`,
        type,
        amount: buyInAmount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error(`❌ [TOURNAMENT REBUY] Error:`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Increase blinds for an active tournament (advance round and set new SB/BB).
   */
  async increaseBlind(clubId: string, tournamentId: string, body: { smallBlind: number; bigBlind: number }) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Only active tournaments can have blinds increased');
    }

    const smallBlind = Number(body.smallBlind);
    const bigBlind = Number(body.bigBlind);
    if (!Number.isFinite(smallBlind) || !Number.isFinite(bigBlind) || smallBlind < 0 || bigBlind < 0) {
      throw new BadRequestException('Small blind and big blind must be valid non-negative numbers');
    }

    let structure = tournament.structure;
    if (typeof structure === 'string') {
      try { structure = JSON.parse(structure); } catch { structure = {}; }
    }
    const currentRound = (structure?.current_round ?? 0) + 1;
    const newStructure = {
      ...(structure || {}),
      current_round: currentRound,
      current_sb: smallBlind,
      current_bb: bigBlind,
    };

    await this.dataSource.query(
      `UPDATE tournaments SET structure = $2::jsonb, updated_at = NOW() WHERE club_id = $1 AND id = $3`,
      [clubId, JSON.stringify(newStructure), tournamentId]
    );

    console.log(`📈 [TOURNAMENT BLINDS] ${tournament.name} round ${currentRound}: ${smallBlind}/${bigBlind}`);

    if (this.eventsService) {
      this.eventsService.emitTournamentBlindsUpdated(clubId, {
        id: tournamentId,
        name: tournament.name,
        currentRound,
        currentSb: smallBlind,
        currentBb: bigBlind,
        structure: newStructure,
      });
      this.eventsService.emitTournamentUpdated(clubId);
    }

    return {
      success: true,
      current_round: currentRound,
      current_sb: smallBlind,
      current_bb: bigBlind,
      message: `Blinds set to ${smallBlind}/${bigBlind} (Round ${currentRound})`,
    };
  }
}

