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
        deal_duration, min_players
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
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

    if (dto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(dto.name);
    }
    if (tournamentType !== undefined) {
      updates.push(`tournament_type = $${paramIndex++}`);
      values.push(tournamentType);
    }
    if (dto.buy_in !== undefined) {
      updates.push(`buy_in = $${paramIndex++}`);
      values.push(dto.buy_in);
    }
    if (dto.entry_fee !== undefined) {
      updates.push(`entry_fee = $${paramIndex++}`);
      values.push(dto.entry_fee);
    }
    if (dto.starting_chips !== undefined) {
      updates.push(`starting_chips = $${paramIndex++}`);
      values.push(dto.starting_chips);
    }
    if (blindStructure !== undefined) {
      updates.push(`blind_structure = $${paramIndex++}`);
      values.push(blindStructure);
    }
    if (dto.number_of_levels !== undefined) {
      updates.push(`number_of_levels = $${paramIndex++}`);
      values.push(dto.number_of_levels);
    }
    if (dto.minutes_per_level !== undefined) {
      updates.push(`minutes_per_level = $${paramIndex++}`);
      values.push(dto.minutes_per_level);
    }
    if (breakStructure !== undefined) {
      updates.push(`break_structure = $${paramIndex++}`);
      values.push(breakStructure);
    }
    if (dto.break_duration !== undefined) {
      updates.push(`break_duration = $${paramIndex++}`);
      values.push(dto.break_duration);
    }
    if (dto.late_registration !== undefined) {
      updates.push(`late_registration = $${paramIndex++}`);
      values.push(dto.late_registration);
    }
    if (payoutStructure !== undefined) {
      updates.push(`payout_structure = $${paramIndex++}`);
      values.push(payoutStructure);
    }
    if (seatDrawMethod !== undefined) {
      updates.push(`seat_draw_method = $${paramIndex++}`);
      values.push(seatDrawMethod);
    }
    if (clockPauseRules !== undefined) {
      updates.push(`clock_pause_rules = $${paramIndex++}`);
      values.push(clockPauseRules);
    }
    if (dto.allow_rebuys !== undefined) {
      updates.push(`allow_rebuys = $${paramIndex++}`);
      values.push(dto.allow_rebuys);
    }
    if (dto.allow_addon !== undefined) {
      updates.push(`allow_addon = $${paramIndex++}`);
      values.push(dto.allow_addon);
    }
    if (dto.allow_reentry !== undefined) {
      updates.push(`allow_reentry = $${paramIndex++}`);
      values.push(dto.allow_reentry);
    }
    if (dto.bounty_amount !== undefined) {
      updates.push(`bounty_amount = $${paramIndex++}`);
      values.push(dto.bounty_amount);
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

    // Rummy-specific fields (nullable, so poker tournaments are unaffected)
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
    if (dto.prize_pool !== undefined) {
      updates.push(`prize_pool = $${paramIndex++}`);
      values.push(dto.prize_pool || null);
    }
    if (dto.min_players !== undefined) {
      updates.push(`min_players = $${paramIndex++}`);
      values.push(dto.min_players || null);
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
    await this.getTournamentById(clubId, tournamentId);

    const query = `
      DELETE FROM tournaments 
      WHERE club_id = $1 AND id = $2
    `;

    await this.dataSource.query(query, [clubId, tournamentId]);
    return { message: 'Tournament deleted successfully' };
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

    const query = `
      UPDATE tournaments 
      SET status = 'active', updated_at = NOW()
      WHERE club_id = $1 AND id = $2
      RETURNING *
    `;

    const result = await this.dataSource.query(query, [clubId, tournamentId]);
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

      // Update winners in tournament_players table and player balances
      for (const winner of dto.winners) {
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

        // Update player balance
        await queryRunner.query(
          `UPDATE players 
           SET current_balance = current_balance + $1,
               updated_at = NOW()
           WHERE id = $2 AND club_id = $3`,
          [winner.prize_amount, winner.player_id, clubId]
        );

        // Create transaction record
        await queryRunner.query(
          `INSERT INTO financial_transactions 
           (club_id, player_id, amount, type, status, description, processed_by)
           VALUES ($1, $2, $3, 'CREDIT', 'COMPLETED', 'Tournament prize - Position ' || $4, 'SYSTEM')`,
          [clubId, winner.player_id, winner.prize_amount, winner.finishing_position]
        );
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
    await this.getTournamentById(clubId, tournamentId);

    // First try tournament_players table
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
        'registered' as registration_status
      FROM tournament_players tp
      INNER JOIN players p ON p.id = tp.player_id
      WHERE tp.tournament_id = $1 AND p.club_id = $2
      ORDER BY 
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
          tr.status as registration_status
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
}

