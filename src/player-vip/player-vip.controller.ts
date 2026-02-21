import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Headers,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PlayerVipService } from './player-vip.service';

@Controller('player-vip')
export class PlayerVipController {
  constructor(private readonly vipService: PlayerVipService) {}

  /**
   * Get VIP points (weighted formula with real data)
   * GET /api/player-vip/points
   */
  @Get('points')
  async getVipPoints(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId?.trim()) throw new BadRequestException('x-player-id header is required');
    if (!clubId?.trim()) throw new BadRequestException('x-club-id header is required');
    return this.vipService.getVipPoints(playerId.trim(), clubId.trim());
  }

  /**
   * Get VIP products available for purchase
   * GET /api/player-vip/products
   */
  @Get('products')
  async getVipProducts(
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!clubId?.trim()) throw new BadRequestException('x-club-id header is required');
    return this.vipService.getVipProducts(clubId.trim());
  }

  /**
   * Purchase a VIP product with points
   * POST /api/player-vip/purchase
   */
  @Post('purchase')
  async purchaseProduct(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: any,
  ) {
    if (!playerId?.trim()) throw new BadRequestException('x-player-id header is required');
    if (!clubId?.trim()) throw new BadRequestException('x-club-id header is required');
    if (!body?.productId) throw new BadRequestException('productId is required');
    return this.vipService.purchaseProduct(playerId.trim(), clubId.trim(), body.productId);
  }

  /**
   * Get player's VIP purchase history
   * GET /api/player-vip/purchases
   */
  @Get('purchases')
  async getPurchaseHistory(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId?.trim()) throw new BadRequestException('x-player-id header is required');
    if (!clubId?.trim()) throw new BadRequestException('x-club-id header is required');
    return this.vipService.getPurchaseHistory(playerId.trim(), clubId.trim());
  }
}
