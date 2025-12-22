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
export class PlayerTournamentsService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Get upcoming tournaments
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

      // Sample tournaments
      const tournaments = [
        {
          id: 'tournament-1',
          name: 'Friday Night Tournament',
          startDate: new Date(Date.now() + 86400000 * 2).toISOString(),
          buyIn: 500,
          prizePool: 10000,
          maxPlayers: 50,
          registeredPlayers: 23,
          status: 'upcoming',
        },
        {
          id: 'tournament-2',
          name: 'Weekend Championship',
          startDate: new Date(Date.now() + 86400000 * 5).toISOString(),
          buyIn: 1000,
          prizePool: 25000,
          maxPlayers: 100,
          registeredPlayers: 45,
          status: 'upcoming',
        },
      ];

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

      return {
        registrations: [],
        total: 0,
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
      throw new BadRequestException('Failed to get registrations');
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

      return {
        success: true,
        message: 'Registered for tournament successfully',
        tournamentId,
        registeredAt: new Date().toISOString(),
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
      throw new BadRequestException('Failed to register for tournament');
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

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

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
      throw new BadRequestException('Failed to cancel registration');
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

