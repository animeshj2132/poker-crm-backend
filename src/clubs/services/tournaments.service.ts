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

    const query = `
      INSERT INTO tournaments (
        club_id, tournament_id, name, tournament_type, buy_in, entry_fee,
        starting_chips, blind_structure, number_of_levels, minutes_per_level,
        break_structure, break_duration, late_registration, payout_structure,
        seat_draw_method, clock_pause_rules, allow_rebuys, allow_addon, 
        allow_reentry, bounty_amount, max_players, start_time, status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, 'scheduled', $23
      ) RETURNING *
    `;

    const values = [
      clubId,
      tournamentId,
      dto.name,
      tournamentType,
      dto.buy_in,
      dto.entry_fee || 0,
      dto.starting_chips,
      blindStructure,
      dto.number_of_levels || 15,
      dto.minutes_per_level || 15,
      breakStructure,
      dto.break_duration || 10,
      dto.late_registration || 60,
      payoutStructure,
      seatDrawMethod || 'Random',
      clockPauseRules || 'Standard',
      dto.allow_rebuys || false,
      dto.allow_addon || false,
      dto.allow_reentry || false,
      dto.bounty_amount || 0,
      dto.max_players || 100,
      dto.start_time || null,
      userId,
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

    const query = `
      SELECT 
        p.id,
        p.player_id,
        p.name,
        p.email,
        p.mobile,
        tp.registered_at,
        tp.seat_number,
        tp.table_number,
        tp.finishing_position,
        tp.prize_amount,
        tp.is_active,
        tr.status as registration_status
      FROM players p
      LEFT JOIN tournament_players tp ON p.id = tp.player_id AND tp.tournament_id = $2
      LEFT JOIN tournament_registrations tr ON p.id = tr.player_id AND tr.tournament_id = $2
      WHERE p.club_id = $1 
        AND (tp.player_id IS NOT NULL OR tr.player_id IS NOT NULL)
      ORDER BY 
        CASE WHEN tp.finishing_position IS NOT NULL THEN tp.finishing_position ELSE 9999 END,
        tr.registered_at DESC
    `;

    const result = await this.dataSource.query(query, [clubId, tournamentId]);
    return result;
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

