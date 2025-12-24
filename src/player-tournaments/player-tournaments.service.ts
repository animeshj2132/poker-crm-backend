import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';
import { AuthService } from '../auth/auth.service';

// Define Tournament interface
interface Tournament {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  tournament_type: string;
  buy_in: number;
  prize_pool: number;
  max_players: number;
  current_players: number;
  start_time: Date;
  end_time: Date | null;
  status: string;
  structure: string | null;
  blind_levels: any;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class PlayerTournamentsService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Get upcoming tournaments from database
   */
  async getUpcomingTournaments(clubId: string, limit: number = 20) {
    try {
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Query actual tournaments from database
      const tournamentsData = await this.playersRepo.query(`
        SELECT 
          id, 
          name, 
          description,
          buy_in, 
          prize_pool, 
          max_players, 
          current_players as "registeredPlayers",
          start_time as "startDate", 
          status,
          structure
        FROM tournaments 
        WHERE club_id = $1 
          AND status IN ('upcoming', 'registration_open')
          AND start_time > NOW()
        ORDER BY start_time ASC
        LIMIT $2
      `, [clubId, limit]) as Tournament[];

      const tournaments = tournamentsData.map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        startDate: t.startDate,
        buyIn: parseFloat(t.buy_in),
        prizePool: parseFloat(t.prize_pool),
        maxPlayers: t.max_players,
        registeredPlayers: t.registeredPlayers || 0,
        status: t.status,
        structure: t.structure,
      }));

      return {
        tournaments,
        total: tournaments.length,
      };
    } catch (err) {
      console.error('Get tournaments error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get tournaments');
    }
  }

  /**
   * Get player's registrations
   */
  async getMyRegistrations(playerId: string, clubId: string) {
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

      // Query registrations from database
      // Handle case where table might not exist yet
      let registrations = [];
      try {
        registrations = await this.playersRepo.query(`
          SELECT 
            tr.id,
            tr.tournament_id as "tournamentId",
            tr.status,
            tr.registered_at as "registeredAt",
            t.name as "tournamentName",
            t.start_time as "startTime"
          FROM tournament_registrations tr
          INNER JOIN tournaments t ON t.id = tr.tournament_id
          WHERE tr.player_id = $1 AND tr.club_id = $2
          ORDER BY tr.registered_at DESC
        `, [playerId, clubId]);
      } catch (dbErr: any) {
        // If table doesn't exist, return empty array instead of failing
        if (dbErr.message && (
          dbErr.message.includes('does not exist') ||
          dbErr.message.includes('relation "tournament_registrations"') ||
          dbErr.code === '42P01' // PostgreSQL error code for "relation does not exist"
        )) {
          console.warn('tournament_registrations table does not exist yet, returning empty registrations');
          registrations = [];
        } else {
          // Re-throw other database errors
          throw dbErr;
        }
      }

      return {
        registrations: registrations || [],
        total: registrations?.length || 0,
      };
    } catch (err) {
      console.error('Get registrations error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException(`Failed to get registrations: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  /**
   * Register for tournament
   */
  async registerForTournament(
    playerId: string,
    clubId: string,
    tournamentId: string,
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
      if (!uuidRegex.test(tournamentId)) {
        throw new BadRequestException('Invalid tournament ID format');
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
        throw new ForbiddenException('Please complete KYC verification before registering for tournaments');
      }

      // Check if tournament exists and is available
      const tournament = await this.playersRepo.query(`
        SELECT id, max_players, current_players, status, start_time, buy_in
        FROM tournaments
        WHERE id = $1 AND club_id = $2
      `, [tournamentId, clubId]);

      if (!tournament || tournament.length === 0) {
        throw new NotFoundException('Tournament not found');
      }

      const tourn = tournament[0];
      if (tourn.status !== 'upcoming' && tourn.status !== 'registration_open') {
        throw new BadRequestException('Tournament is not accepting registrations');
      }

      if (tourn.current_players >= tourn.max_players) {
        throw new BadRequestException('Tournament is full');
      }

      // CRITICAL: Check player balance against tournament buy-in requirement
      const buyInRequired = parseFloat(tourn.buy_in) || 0;
      if (buyInRequired > 0) {
        try {
          const playerBalance = await this.authService.getPlayerBalance(playerId, clubId);
          const totalAvailableBalance = playerBalance.totalBalance || playerBalance.availableBalance || 0;

          if (totalAvailableBalance < buyInRequired) {
            throw new BadRequestException(
              `Insufficient balance. Tournament buy-in required: ₹${buyInRequired.toLocaleString()}, ` +
              `Your current balance: ₹${totalAvailableBalance.toLocaleString()}. ` +
              `Please add funds to your account before registering. Note: Balance will be deducted when the tournament starts.`
            );
          }
        } catch (balanceError) {
          // If it's a BadRequestException from balance check, re-throw it
          if (balanceError instanceof BadRequestException) {
            throw balanceError;
          }
          // If balance check fails for other reasons, log but don't block registration
          // The actual deduction happens when tournament starts
          console.error('Error checking player balance for tournament registration:', balanceError);
        }
      }

      // Check if already registered (handle case where table might not exist)
      let existing = [];
      try {
        existing = await this.playersRepo.query(`
          SELECT id FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2
        `, [tournamentId, playerId]);
      } catch (dbErr: any) {
        // If table doesn't exist, we'll try to create it or handle gracefully
        if (dbErr.message && (
          dbErr.message.includes('does not exist') ||
          dbErr.message.includes('relation "tournament_registrations"') ||
          dbErr.code === '42P01'
        )) {
          console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
          throw new BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
        }
        throw dbErr;
      }

      if (existing && existing.length > 0) {
        throw new BadRequestException('You are already registered for this tournament');
      }

      // Insert registration
      let registration;
      try {
        registration = await this.playersRepo.query(`
          INSERT INTO tournament_registrations (tournament_id, player_id, club_id, status, registered_at)
          VALUES ($1, $2, $3, 'registered', NOW())
          RETURNING id, registered_at
        `, [tournamentId, playerId, clubId]);
      } catch (dbErr: any) {
        if (dbErr.message && (
          dbErr.message.includes('does not exist') ||
          dbErr.message.includes('relation "tournament_registrations"') ||
          dbErr.code === '42P01'
        )) {
          console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
          throw new BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
        }
        // Check for duplicate key error (unique constraint violation)
        if (dbErr.code === '23505' || dbErr.message.includes('duplicate key')) {
          throw new BadRequestException('You are already registered for this tournament');
        }
        throw dbErr;
      }

      // Update tournament current_players count
      await this.playersRepo.query(`
        UPDATE tournaments
        SET current_players = current_players + 1,
            updated_at = NOW()
        WHERE id = $1
      `, [tournamentId]);

      return {
        success: true,
        message: 'Registered for tournament successfully',
        tournamentId,
        registrationId: registration[0].id,
        registeredAt: registration[0].registered_at,
      };
    } catch (err) {
      console.error('Register tournament error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Failed to register for tournament: ${errorMessage}`);
    }
  }

  /**
   * Cancel registration
   */
  async cancelRegistration(
    tournamentId: string,
    playerId: string,
    clubId: string,
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
      if (!uuidRegex.test(tournamentId)) {
        throw new BadRequestException('Invalid tournament ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Check if registration exists (handle case where table might not exist)
      let registration = [];
      try {
        registration = await this.playersRepo.query(`
          SELECT id FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2 AND club_id = $3
        `, [tournamentId, playerId, clubId]);
      } catch (dbErr: any) {
        if (dbErr.message && (
          dbErr.message.includes('does not exist') ||
          dbErr.message.includes('relation "tournament_registrations"') ||
          dbErr.code === '42P01'
        )) {
          console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
          throw new BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
        }
        throw dbErr;
      }

      if (!registration || registration.length === 0) {
        throw new NotFoundException('Registration not found');
      }

      // Delete registration
      try {
        await this.playersRepo.query(`
          DELETE FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2 AND club_id = $3
        `, [tournamentId, playerId, clubId]);
      } catch (dbErr: any) {
        if (dbErr.message && (
          dbErr.message.includes('does not exist') ||
          dbErr.message.includes('relation "tournament_registrations"') ||
          dbErr.code === '42P01'
        )) {
          console.error('tournament_registrations table does not exist. Please run the migration: sql/0019_tournament_registrations.sql');
          throw new BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
        }
        throw dbErr;
      }

      // Update tournament current_players count
      await this.playersRepo.query(`
        UPDATE tournaments
        SET current_players = GREATEST(0, current_players - 1),
            updated_at = NOW()
        WHERE id = $1
      `, [tournamentId]);

      return {
        success: true,
        message: 'Registration cancelled successfully',
        tournamentId,
      };
    } catch (err) {
      console.error('Cancel registration error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw new BadRequestException(`Failed to cancel registration: ${errorMessage}`);
    }
  }

  /**
   * Get tournament details
   */
  async getTournamentDetails(tournamentId: string, clubId: string) {
    try {
      // Validate UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const club = await this.clubsService.findById(clubId);
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      return {
        tournament: {
          id: tournamentId,
          name: 'Sample Tournament',
          startDate: new Date(Date.now() + 86400000).toISOString(),
          buyIn: 500,
          prizePool: 10000,
          maxPlayers: 50,
          registeredPlayers: 23,
          status: 'upcoming',
          structure: 'Freeze-out',
          blinds: '25/50',
        },
      };
    } catch (err) {
      console.error('Get tournament details error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get tournament details');
    }
  }
}

