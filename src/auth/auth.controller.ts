import { Body, Controller, Delete, Get, Headers, Param, Post, Put, Query, UnauthorizedException, UseGuards, UsePipes, ValidationPipe, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginDto } from './dto/login.dto';
import { PlayerLoginDto } from './dto/player-login.dto';
import { PlayerSignupDto } from './dto/player-signup.dto';
import { UpdatePlayerProfileDto } from './dto/update-player-profile.dto';
import { ChangePlayerPasswordDto } from './dto/change-player-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) {}

  @Get('me')
  async me(@Headers('x-api-key') apiKey?: string) {
    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }
    const user = await this.authService.validateApiKey(apiKey);
    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }
    return user;
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() dto: LoginDto) {
    if (!dto.email || !dto.email.trim()) {
      throw new UnauthorizedException('Email is required');
    }
    if (!dto.password || !dto.password.trim()) {
      throw new UnauthorizedException('Password is required');
    }
    return this.authService.login(dto.email.trim(), dto.password);
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (!dto.email || !dto.email.trim()) {
      throw new UnauthorizedException('Email is required');
    }
    if (!dto.currentPassword || !dto.currentPassword.trim()) {
      throw new UnauthorizedException('Current password is required');
    }
    if (!dto.newPassword || !dto.newPassword.trim()) {
      throw new UnauthorizedException('New password is required');
    }
    return this.usersService.resetPassword(dto.email.trim(), dto.currentPassword, dto.newPassword);
  }

  /**
   * Player login with club code
   * POST /api/auth/player/login
   */
  @Post('player/login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async playerLogin(@Body() dto: PlayerLoginDto) {
    return this.authService.playerLogin(dto.clubCode, dto.email, dto.password);
  }

  /**
   * Player signup with club code
   * POST /api/auth/player/signup
   */
  @Post('player/signup')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async playerSignup(@Body() dto: PlayerSignupDto) {
    return this.authService.playerSignup(
      dto.clubCode,
      dto.firstName,
      dto.lastName,
      dto.email,
      dto.password,
      dto.phoneNumber,
      dto.nickname,
      dto.referralCode
    );
  }

  /**
   * Get player profile
   * GET /api/auth/player/me
   */
  @Get('player/me')
  async getPlayerProfile(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.authService.getPlayerProfile(playerId.trim(), clubId.trim());
  }

  /**
   * Update player profile
   * PUT /api/auth/player/profile
   */
  @Put('player/profile')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePlayerProfile(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() dto?: UpdatePlayerProfileDto
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!dto) {
      throw new BadRequestException('Request body is required');
    }
    return this.authService.updatePlayerProfile(
      playerId.trim(),
      clubId.trim(),
      dto.firstName,
      dto.lastName,
      dto.phoneNumber,
      dto.nickname
    );
  }

  /**
   * Change player password
   * POST /api/auth/player/change-password
   */
  @Post('player/change-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async changePlayerPassword(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() dto?: ChangePlayerPasswordDto
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!dto) {
      throw new BadRequestException('Request body is required');
    }
    return this.authService.changePlayerPassword(
      playerId.trim(),
      clubId.trim(),
      dto.currentPassword,
      dto.newPassword
    );
  }

  /**
   * Get player balance
   * GET /api/auth/player/balance
   */
  @Get('player/balance')
  async getPlayerBalance(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.authService.getPlayerBalance(playerId.trim(), clubId.trim());
  }

  /**
   * Get player transactions
   * GET /api/auth/player/transactions
   */
  @Get('player/transactions')
  async getPlayerTransactions(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    return this.authService.getPlayerTransactions(playerId.trim(), clubId.trim(), limitNum, offsetNum);
  }

  /**
   * Join waitlist
   * POST /api/auth/player/waitlist
   */
  @Post('player/waitlist')
  async joinWaitlist(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: { tableType?: string; partySize?: number }
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.authService.joinWaitlist(
      playerId.trim(),
      clubId.trim(),
      body?.tableType,
      body?.partySize || 1
    );
  }

  /**
   * Get waitlist status
   * GET /api/auth/player/waitlist
   */
  @Get('player/waitlist')
  async getWaitlistStatus(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.authService.getWaitlistStatus(playerId.trim(), clubId.trim());
  }

  /**
   * Cancel waitlist entry
   * DELETE /api/auth/player/waitlist/:entryId
   */
  @Delete('player/waitlist/:entryId')
  async cancelWaitlist(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Param('entryId') entryId?: string
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!entryId || !entryId.trim()) {
      throw new BadRequestException('Entry ID is required');
    }
    return this.authService.cancelWaitlist(playerId.trim(), clubId.trim(), entryId.trim());
  }

  /**
   * Get available tables
   * GET /api/auth/player/tables
   */
  @Get('player/tables')
  async getAvailableTables(
    @Headers('x-club-id') clubId?: string
  ) {
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.authService.getAvailableTables(clubId.trim());
  }

  /**
   * Get table details
   * GET /api/auth/player/tables/:tableId
   */
  @Get('player/tables/:tableId')
  async getTableDetails(
    @Headers('x-club-id') clubId?: string,
    @Param('tableId') tableId?: string
  ) {
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!tableId || !tableId.trim()) {
      throw new BadRequestException('Table ID is required');
    }
    return this.authService.getTableDetails(clubId.trim(), tableId.trim());
  }

  /**
   * Request credit
   * POST /api/auth/player/credit-request
   */
  @Post('player/credit-request')
  async requestCredit(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: { amount: number; notes?: string }
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!body || body.amount === undefined) {
      throw new BadRequestException('Amount is required');
    }
    return this.authService.requestCredit(playerId.trim(), clubId.trim(), body.amount, body.notes);
  }

  /**
   * Get player stats
   * GET /api/auth/player/stats
   */
  @Get('player/stats')
  async getPlayerStats(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.authService.getPlayerStats(playerId.trim(), clubId.trim());
  }

  /**
   * Place FNB Order
   * POST /api/auth/player/fnb/order
   */
  @Post('player/fnb/order')
  async placeFnbOrder(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: any
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    if (!body) {
      throw new BadRequestException('Order data is required');
    }
    return this.authService.placeFnbOrder(playerId.trim(), clubId.trim(), body);
  }
}



