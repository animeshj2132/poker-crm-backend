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
import { TournamentsService } from '../clubs/services/tournaments.service';
import { AuditLogsService } from '../clubs/services/audit-logs.service';
import { ActionCategory } from '../clubs/dto/create-audit-log.dto';
import { DataSource } from 'typeorm';

@Controller('player-tournaments')
export class PlayerTournamentsController {
  constructor(
    private readonly tournamentsService: PlayerTournamentsService,
    private readonly adminTournamentsService: TournamentsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly dataSource: DataSource,
  ) {}

  private async getPlayerName(playerId: string, clubId: string): Promise<string> {
    try {
      const rows = await this.dataSource.query(
        `SELECT name FROM players WHERE id = $1 AND club_id = $2`, [playerId, clubId]
      );
      return rows?.[0]?.name || 'Player';
    } catch { return 'Player'; }
  }

  /**
   * Get upcoming tournaments
   * GET /api/player-tournaments/upcoming
   */
  @Get('upcoming')
  async getUpcomingTournaments(
    @Headers('x-club-id') clubId?: string,
    @Query('limit') limit?: string,
  ) {
    console.log('🎯 [CONTROLLER] Received x-club-id:', clubId);
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    const limitNum = limit ? parseInt(limit, 10) : 20;
    console.log('🎯 [CONTROLLER] Calling service with clubId:', clubId.trim(), 'limit:', limitNum);
    const result = await this.tournamentsService.getUpcomingTournaments(clubId.trim(), limitNum);
    console.log('🎯 [CONTROLLER] Service returned:', JSON.stringify(result));
    return result;
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
    const result = await this.tournamentsService.registerForTournament(
      playerId.trim(),
      clubId.trim(),
      body.tournamentId,
    );
    try {
      const pName = await this.getPlayerName(playerId.trim(), clubId.trim());
      await this.auditLogsService.logAction({
        clubId: clubId.trim(), staffName: pName, staffRole: 'Player',
        actionType: 'player_tournament_registered', actionCategory: ActionCategory.TOURNAMENT,
        description: `Player ${pName} registered for tournament`,
        targetType: 'tournament', targetId: body.tournamentId, targetName: pName,
      });
    } catch (e) { console.error('Audit log error:', e); }
    return result;
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
    const result = await this.tournamentsService.cancelRegistration(
      tournamentId,
      playerId.trim(),
      clubId.trim(),
    );
    try {
      const pName = await this.getPlayerName(playerId.trim(), clubId.trim());
      await this.auditLogsService.logAction({
        clubId: clubId.trim(), staffName: pName, staffRole: 'Player',
        actionType: 'player_tournament_registration_cancelled', actionCategory: ActionCategory.TOURNAMENT,
        description: `Player ${pName} cancelled tournament registration`,
        targetType: 'tournament', targetId: tournamentId, targetName: pName,
      });
    } catch (e) { console.error('Audit log error:', e); }
    return result;
  }

  /**
   * Get player's status in a specific tournament
   * GET /api/player-tournaments/:tournamentId/my-status
   */
  @Get(':tournamentId/my-status')
  async getMyTournamentStatus(
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
    return this.tournamentsService.getPlayerTournamentStatus(
      playerId.trim(),
      clubId.trim(),
      tournamentId,
    );
  }

  /**
   * Player requests rebuy or re-entry
   * POST /api/player-tournaments/:tournamentId/rebuy
   */
  @Post(':tournamentId/rebuy')
  async requestRebuy(
    @Param('tournamentId') tournamentId: string,
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
    const type = body?.type || 'rebuy';
    if (!['rebuy', 'reentry'].includes(type)) {
      throw new BadRequestException('type must be "rebuy" or "reentry"');
    }
    const result = await this.adminTournamentsService.rebuyTournamentPlayer(
      clubId.trim(),
      tournamentId,
      playerId.trim(),
      type,
    );
    try {
      const pName = await this.getPlayerName(playerId.trim(), clubId.trim());
      await this.auditLogsService.logAction({
        clubId: clubId.trim(), staffName: pName, staffRole: 'Player',
        actionType: `player_tournament_${type}`, actionCategory: ActionCategory.TOURNAMENT,
        description: `Player ${pName} requested ${type} in tournament`,
        targetType: 'tournament', targetId: tournamentId, targetName: pName,
      });
    } catch (e) { console.error('Audit log error:', e); }
    return result;
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














