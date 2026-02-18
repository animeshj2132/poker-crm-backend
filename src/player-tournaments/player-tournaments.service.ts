import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, DataSource } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { FinancialTransaction, TransactionType, TransactionStatus } from '../clubs/entities/financial-transaction.entity';
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
    @InjectRepository(FinancialTransaction)
    private readonly transactionRepo: Repository<FinancialTransaction>,
    private readonly dataSource: DataSource,
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
      console.log('🏆 [TOURNAMENTS] Fetching tournaments for club:', clubId);
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
          structure,
          session_started_at,
          late_registration,
          rummy_variant
        FROM tournaments 
        WHERE club_id = $1 
          AND status NOT IN ('completed', 'cancelled')
        ORDER BY start_time ASC
        LIMIT $2
      `, [clubId, limit]) as Tournament[];
      console.log('🏆 [TOURNAMENTS] Found tournaments:', tournamentsData.length, tournamentsData);

      const tournaments = tournamentsData.map((t: any) => {
        // Parse structure to extract late_registration if stored in JSONB
        let structure = t.structure || {};
        if (typeof structure === 'string') {
          try { structure = JSON.parse(structure); } catch { structure = {}; }
        }
        const lateRegistrationMinutes = t.late_registration || structure.late_registration || 0;

        return {
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
          sessionStartedAt: t.session_started_at || null,
          lateRegistrationMinutes,
          gameType: t.rummy_variant ? 'rummy' : 'poker',
        };
      });

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
        SELECT id, name, max_players, current_players, status, start_time, buy_in, rummy_variant,
               session_started_at, structure
        FROM tournaments
        WHERE id = $1 AND club_id = $2
      `, [tournamentId, clubId]);

      if (!tournament || tournament.length === 0) {
        throw new NotFoundException('Tournament not found');
      }

      const tourn = tournament[0];
      const allowedStatuses = ['scheduled', 'upcoming', 'registration_open', 'registering', 'active'];
      if (!allowedStatuses.includes(tourn.status)) {
        throw new BadRequestException(`Tournament is not accepting registrations (status: ${tourn.status})`);
      }

      // If tournament is active, enforce late registration window
      if (tourn.status === 'active' && tourn.session_started_at) {
        let structure = tourn.structure || {};
        if (typeof structure === 'string') {
          try { structure = JSON.parse(structure); } catch { structure = {}; }
        }
        const lateRegistrationMinutes = structure.late_registration || tourn.late_registration || 0;

        if (lateRegistrationMinutes > 0) {
          const sessionStart = new Date(tourn.session_started_at).getTime();
          const now = Date.now();
          const elapsedMinutes = (now - sessionStart) / (1000 * 60);
          if (elapsedMinutes > lateRegistrationMinutes) {
            throw new BadRequestException(
              `Late registration window has closed. Registration was allowed for ${lateRegistrationMinutes} minutes after tournament start.`
            );
          }
        } else {
          // No late registration configured — don't allow new registrations once active
          throw new BadRequestException(
            'This tournament does not allow late registration. Registration closed when the tournament started.'
          );
        }
      }

      if (tourn.current_players >= tourn.max_players) {
        throw new BadRequestException('Tournament is full');
      }

      // CRITICAL: Check player has minimum balance (but don't deduct yet - that happens when tournament starts)
      const buyInRequired = parseFloat(tourn.buy_in) || 0;
      
      if (buyInRequired > 0) {
        try {
          const playerBalance = await this.authService.getPlayerBalance(playerId, clubId);
          const availableBalance = playerBalance.availableBalance || 0;

          if (availableBalance < buyInRequired) {
            throw new BadRequestException(
              `Insufficient balance. Tournament minimum buy-in: ₹${buyInRequired.toLocaleString()}, ` +
              `Your current balance: ₹${availableBalance.toLocaleString()}. ` +
              `Please add funds before registering.`
            );
          }
        } catch (balanceError) {
          // If it's a BadRequestException from balance check, re-throw it
          if (balanceError instanceof BadRequestException) {
            throw balanceError;
          }
          // If balance check fails for other reasons, log but don't block registration
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

      // Use database transaction to ensure atomicity (registration + buy-in deduction)
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Insert registration
        const registration = await queryRunner.query(`
          INSERT INTO tournament_registrations (tournament_id, player_id, club_id, status, registered_at)
          VALUES ($1, $2, $3, 'registered', NOW())
          RETURNING id, registered_at
        `, [tournamentId, playerId, clubId]);

        if (!registration || registration.length === 0) {
          throw new BadRequestException('Failed to create registration');
        }

        // Update tournament current_players count
        await queryRunner.query(`
          UPDATE tournaments
          SET current_players = current_players + 1,
              updated_at = NOW()
          WHERE id = $1
        `, [tournamentId]);

        // DEDUCT registration fee from player balance
        if (buyInRequired > 0) {
          console.log(`💰 [TOURNAMENT REG] Deducting ₹${buyInRequired} from player ${playerId}`);
          
          // Determine game type from tournament (poker or rummy)
          const gameType = tourn.rummy_variant ? 'rummy' : 'poker';
          const gameLabel = gameType.charAt(0).toUpperCase() + gameType.slice(1);

          // Create financial transaction for tournament registration fee
          const transactionResult = await queryRunner.query(`
            INSERT INTO financial_transactions (
              club_id, player_id, player_name, type, amount, status, game_type, notes, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            RETURNING id
          `, [
            clubId,
            playerId,
            player.name || 'Unknown Player',
            'Buy In',
            buyInRequired,
            'Completed',
            gameType,
            `${gameLabel} Tournament Registration: ${tourn.name} (ID: ${tournamentId})`
          ]);

          console.log(`💰 [TOURNAMENT REG] Transaction created: ${transactionResult[0].id}`);
        }

        await queryRunner.commitTransaction();

        return {
          success: true,
          message: buyInRequired > 0 
            ? `Registered successfully! ₹${buyInRequired.toLocaleString()} has been deducted from your balance.`
            : 'Registered for tournament successfully',
          tournamentId,
          registrationId: registration[0].id,
          registeredAt: registration[0].registered_at,
          amountDeducted: buyInRequired,
        };
      } catch (dbErr: any) {
        await queryRunner.rollbackTransaction();
        
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
      } finally {
        await queryRunner.release();
      }
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

      // Get tournament details for refund
      const tournament = await this.playersRepo.query(`
        SELECT name, buy_in, rummy_variant FROM tournaments WHERE id = $1 AND club_id = $2
      `, [tournamentId, clubId]);

      const buyInAmount = tournament && tournament.length > 0 ? parseFloat(tournament[0].buy_in) : 0;
      const tournamentName = tournament && tournament.length > 0 ? tournament[0].name : 'Unknown Tournament';
      const cancelGameType = tournament && tournament.length > 0 && tournament[0].rummy_variant ? 'rummy' : 'poker';
      const cancelGameLabel = cancelGameType.charAt(0).toUpperCase() + cancelGameType.slice(1);

      // Use transaction to ensure atomicity
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Delete registration
        await queryRunner.query(`
          DELETE FROM tournament_registrations
          WHERE tournament_id = $1 AND player_id = $2 AND club_id = $3
        `, [tournamentId, playerId, clubId]);

        // Update tournament current_players count
        await queryRunner.query(`
          UPDATE tournaments
          SET current_players = GREATEST(0, current_players - 1),
              updated_at = NOW()
          WHERE id = $1
        `, [tournamentId]);

        // REFUND the registration fee
        if (buyInAmount > 0) {
          console.log(`💰 [TOURNAMENT CANCEL] Refunding ₹${buyInAmount} to player ${playerId}`);
          
          await queryRunner.query(`
            INSERT INTO financial_transactions (
              club_id, player_id, player_name, type, amount, status, game_type, notes, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          `, [
            clubId,
            playerId,
            player.name || 'Unknown Player',
            'Refund',
            buyInAmount,
            'Completed',
            cancelGameType,
            `${cancelGameLabel} Tournament Registration Refund: ${tournamentName} (ID: ${tournamentId})`
          ]);

          console.log(`💰 [TOURNAMENT CANCEL] Refund completed for player ${playerId}`);
        }

        await queryRunner.commitTransaction();

        return {
          success: true,
          message: buyInAmount > 0 
            ? `Registration cancelled successfully. ₹${buyInAmount.toLocaleString()} has been refunded to your balance.`
            : 'Registration cancelled successfully',
          tournamentId,
          amountRefunded: buyInAmount,
        };
      } catch (dbErr: any) {
        await queryRunner.rollbackTransaction();
        
        if (dbErr.message && (
          dbErr.message.includes('does not exist') ||
          dbErr.message.includes('relation "tournament_registrations"') ||
          dbErr.code === '42P01'
        )) {
          throw new BadRequestException('Tournament registration system is not set up. Please contact support or run the database migration.');
        }
        throw dbErr;
      } finally {
        await queryRunner.release();
      }
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

