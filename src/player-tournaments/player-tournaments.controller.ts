import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { PlayerTournamentsService } from './player-tournaments.service';

@Controller('player-tournaments')
export class PlayerTournamentsController {
  constructor(private readonly tournamentsService: PlayerTournamentsService) {}

  /**
   * Get upcoming tournaments
   * GET /api/player-tournaments/upcoming
   */
  @Get('upcoming')
  async getUpcomingTournaments(
    @Headers('x-club-id') clubId?: string,
    @Query('limit') limit?: string,
  ) {
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.tournamentsService.getUpcomingTournaments(clubId.trim(), limitNum);
  }

  /**
   * Get my registrations
   * GET /api/player-tournaments/my-registrations
   */
  @Get('my-registrations')
  async getMyRegistrations(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.tournamentsService.getMyRegistrations(playerId.trim(), clubId.trim());
  }

  /**
   * Register for tournament
   * POST /api/player-tournaments/register
   */
  @Post('register')
  async registerForTournament(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: any,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!body?.tournamentId) {
      throw new BadRequestException('tournamentId is required');
    }
    return this.tournamentsService.registerForTournament(
      playerId.trim(),
      clubId.trim(),
      body.tournamentId,
    );
  }

  /**
   * Cancel registration
   * DELETE /api/player-tournaments/register/:tournamentId
   */
  @Delete('register/:tournamentId')
  async cancelRegistration(
    @Param('tournamentId') tournamentId: string,
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.tournamentsService.cancelRegistration(
      tournamentId,
      playerId.trim(),
      clubId.trim(),
    );
  }

  /**
   * Get tournament details
   * GET /api/player-tournaments/:tournamentId
   */
  @Get(':tournamentId')
  async getTournamentDetails(
    @Param('tournamentId') tournamentId: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.tournamentsService.getTournamentDetails(tournamentId, clubId.trim());
  }
}












