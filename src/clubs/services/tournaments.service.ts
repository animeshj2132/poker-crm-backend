import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CreateTournamentDto } from '../dto/create-tournament.dto';
import { UpdateTournamentDto } from '../dto/update-tournament.dto';
import { EndTournamentDto } from '../dto/end-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  /**
   * Determine game type from tournament data (poker vs rummy)
   */
  private getGameType(tournament: any): string {
    return tournament.rummy_variant ? 'rummy' : 'poker';
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
    };

    const query = `
      INSERT INTO tournaments (
        club_id, name, buy_in, prize_pool, max_players, start_time, status, structure,
        rummy_variant, number_of_deals, points_per_deal, drop_points, max_points,
        deal_duration, min_players, late_registration
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `;

    // Set default start_time if not provided (required field)
    const startTime = dto.start_time || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow if not provided

    const values = [
      clubId,
      dto.name,
      dto.buy_in,
      dto.prize_pool || 0,
      dto.max_players || 100,
      startTime,
      'scheduled',
      structureData ? JSON.stringify(structureData) : null,
      // Rummy-specific fields
      dto.rummy_variant || null,
      dto.number_of_deals || null,
      dto.points_per_deal || null,
      dto.drop_points || null,
      dto.max_points || null,
      dto.deal_duration || null,
      dto.min_players || null,
      dto.late_registration || null,
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
    if (dto.prize_pool !== undefined) {
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
    if (dto.late_registration !== undefined) {
      updates.push(`late_registration = $${paramIndex++}`);
      values.push(dto.late_registration || null);
    }

    // Handle poker-specific fields in structure JSONB column
    const hasPokerFields = tournamentType || dto.entry_fee !== undefined || dto.starting_chips !== undefined || 
                          blindStructure || dto.number_of_levels !== undefined || dto.minutes_per_level !== undefined ||
                          breakStructure || dto.break_duration !== undefined || dto.late_registration !== undefined ||
                          payoutStructure || seatDrawMethod || clockPauseRules ||
                          dto.allow_rebuys !== undefined || dto.allow_addon !== undefined || 
                          dto.allow_reentry !== undefined || dto.bounty_amount !== undefined;

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

      console.log(`🏆 [TOURNAMENT START] Taking balance from ${registeredPlayers.length} registered players`);

      // Take ENTIRE balance from each registered player
      for (const participant of registeredPlayers) {
        // Calculate player's entire available balance
        const balanceResult = await queryRunner.query(
          `SELECT SUM(
            CASE 
              WHEN type IN ('DEPOSIT', 'BUY_IN', 'CREDIT') THEN amount
              WHEN type IN ('WITHDRAWAL', 'CASHOUT', 'DEBIT') THEN -amount
              ELSE 0
            END
          ) as total FROM financial_transactions 
          WHERE club_id = $1 AND player_id = $2 AND status = 'Completed'`,
          [clubId, participant.player_id]
        );

        const availableBalance = balanceResult[0]?.total ? Number(balanceResult[0].total) : 0;

        if (availableBalance > 0) {
          const gameType = this.getGameType(tournament);
          // Create BUY_IN transaction for entire balance with correct game type
          await queryRunner.query(
            `INSERT INTO financial_transactions (club_id, player_id, player_name, amount, type, status, game_type, notes)
             VALUES ($1, $2, $3, $4, 'BUY_IN', 'Completed', $6, $5)`,
            [
              clubId,
              participant.player_id,
              participant.player_name,
              availableBalance,
              `${gameType.charAt(0).toUpperCase() + gameType.slice(1)} Tournament buy-in - ${tournament.name || 'Tournament'} (Full balance: ₹${availableBalance.toFixed(2)})`,
              gameType
            ]
          );

          console.log(`✅ [TOURNAMENT START] Took ₹${availableBalance} from player ${participant.player_name}`);
        } else {
          console.warn(`⚠️ [TOURNAMENT START] Player ${participant.player_name} has no balance, skipping`);
        }
      }

      const sessionStartedAt = new Date().toISOString();

      // Update tournament status to active and set session start time
      const result = await queryRunner.query(
        `UPDATE tournaments 
         SET status = 'active', session_started_at = $3, updated_at = NOW()
         WHERE club_id = $1 AND id = $2
         RETURNING *`,
        [clubId, tournamentId, sessionStartedAt]
      );

      // Set session_started_at on all tournament_players entries
      await queryRunner.query(
        `UPDATE tournament_players 
         SET session_started_at = $2, is_exited = false
         WHERE tournament_id = $1`,
        [tournamentId, sessionStartedAt]
      );

      // Also update tournament_registrations entries into tournament_players if not already there
      await queryRunner.query(
        `INSERT INTO tournament_players (tournament_id, player_id, is_active, session_started_at, is_exited)
         SELECT tr.tournament_id, tr.player_id, true, $2, false
         FROM tournament_registrations tr
         WHERE tr.tournament_id = $1 AND tr.status = 'registered'
         ON CONFLICT (tournament_id, player_id) DO UPDATE SET session_started_at = $2, is_active = true, is_exited = false`,
        [tournamentId, sessionStartedAt]
      );

      await queryRunner.commitTransaction();

      console.log(`✅ [TOURNAMENT START] Tournament ${tournament.name} started successfully`);
      return result[0];
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

    console.log(`⏸️ [TOURNAMENT PAUSE] Tournament ${tournament.name} paused`);
    return result[0];
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

    console.log(`▶️ [TOURNAMENT RESUME] Tournament ${tournament.name} resumed (was paused ${pausedSeconds}s, total paused: ${newTotalPaused}s)`);
    return result[0];
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

    // Mark all active players as inactive
    await this.dataSource.query(
      `UPDATE tournament_players 
       SET is_active = false
       WHERE tournament_id = $1 AND is_active = true`,
      [tournamentId]
    );

    console.log(`🛑 [TOURNAMENT STOP] Tournament ${tournament.name} stopped (forced end without winners)`);
    return result[0];
  }

  // End tournament with winners
  async endTournament(clubId: string, tournamentId: string, dto: EndTournamentDto) {
    const tournament = await this.getTournamentById(clubId, tournamentId);

    if (tournament.status !== 'active') {
      throw new BadRequestException('Only active tournaments can be ended');
    }

    // Start transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update tournament status
      await queryRunner.query(
        `UPDATE tournaments SET status = 'completed', updated_at = NOW() 
         WHERE club_id = $1 AND id = $2`,
        [clubId, tournamentId]
      );

      const gameType = this.getGameType(tournament);
      const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);

      // Update winners in tournament_players table and player balances
      for (const winner of dto.winners) {
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

        // Create transaction record (CREDIT to player wallet)
        if (winner.prize_amount > 0) {
          await queryRunner.query(
            `INSERT INTO financial_transactions 
             (club_id, player_id, player_name, amount, type, status, game_type, notes)
             VALUES ($1, $2, $3, $4, 'CREDIT', 'Completed', $5, $6)`,
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
          SELECT SUM(
            CASE 
              WHEN ft.type IN ('DEPOSIT', 'BUY_IN', 'CREDIT') THEN ft.amount
              WHEN ft.type IN ('WITHDRAWAL', 'CASHOUT', 'DEBIT') THEN -ft.amount
              ELSE 0
            END
          ) FROM financial_transactions ft 
          WHERE ft.club_id = $2 AND ft.player_id = p.id AND ft.status = 'Completed'
        ), 0) as wallet_balance,
        COALESCE((
          SELECT SUM(ft.amount) FROM financial_transactions ft 
          WHERE ft.club_id = $2 AND ft.player_id = p.id AND ft.status = 'Completed' AND ft.type = 'CREDIT'
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
            SELECT SUM(
              CASE 
                WHEN ft.type IN ('DEPOSIT', 'BUY_IN', 'CREDIT') THEN ft.amount
                WHEN ft.type IN ('WITHDRAWAL', 'CASHOUT', 'DEBIT') THEN -ft.amount
                ELSE 0
              END
            ) FROM financial_transactions ft 
            WHERE ft.club_id = $2 AND ft.player_id = p.id AND ft.status = 'Completed'
          ), 0) as wallet_balance,
          COALESCE((
            SELECT SUM(ft.amount) FROM financial_transactions ft 
            WHERE ft.club_id = $2 AND ft.player_id = p.id AND ft.status = 'Completed' AND ft.type = 'CREDIT'
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

    // Check player is in the tournament and not already exited
    const playerCheck = await this.dataSource.query(
      `SELECT tp.*, p.name as player_name 
       FROM tournament_players tp
       INNER JOIN players p ON p.id = tp.player_id
       WHERE tp.tournament_id = $1 AND tp.player_id = $2`,
      [tournamentId, playerId]
    );

    if (!playerCheck || playerCheck.length === 0) {
      throw new NotFoundException('Player not found in this tournament');
    }

    const playerEntry = playerCheck[0];
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
        [tournamentId, playerId, exitedAt, exitBalance]
      );

      // If exit_balance > 0, credit it back to the player with correct game type
      if (exitBalance > 0) {
        const gameType = this.getGameType(tournament);
        const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes)
           VALUES ($1, $2, $3, $4, 'CREDIT', 'Completed', $6, $5)`,
          [
            clubId,
            playerId,
            playerEntry.player_name,
            exitBalance,
            notes || `${gameLabel} Tournament exit cashout - ${tournament.name}`,
            gameType
          ]
        );

        console.log(`💰 [TOURNAMENT EXIT] Credited ₹${exitBalance} to player ${playerEntry.player_name}`);
      } else {
        console.log(`🔴 [TOURNAMENT EXIT] Player ${playerEntry.player_name} exited with ₹0 (bust)`);
      }

      await queryRunner.commitTransaction();

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
    const lateRegistrationMinutes = structure.late_registration || tournament.late_registration || 0;
    const buyInAmount = parseFloat(tournament.buy_in) || 0;

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
    const playerCheck = await this.dataSource.query(
      `SELECT tp.*, p.name as player_name 
       FROM tournament_players tp
       INNER JOIN players p ON p.id = tp.player_id
       WHERE tp.tournament_id = $1 AND tp.player_id = $2`,
      [tournamentId, playerId]
    );

    if (!playerCheck || playerCheck.length === 0) {
      throw new NotFoundException('Player not found in this tournament');
    }

    const playerEntry = playerCheck[0];

    // For rebuy/reentry, player must be exited
    if ((type === 'rebuy' || type === 'reentry') && !playerEntry.is_exited) {
      throw new BadRequestException('Player must be exited to rebuy or re-enter');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduct buy-in from player balance with correct game type
      const gameType = this.getGameType(tournament);
      const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);
      if (buyInAmount > 0) {
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, player_name, amount, type, status, game_type, notes)
           VALUES ($1, $2, $3, $4, 'BUY_IN', 'Completed', $6, $5)`,
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
      if (type === 'rebuy' || type === 'reentry') {
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
}

