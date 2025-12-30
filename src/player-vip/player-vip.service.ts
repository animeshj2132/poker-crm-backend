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

// VIP Tier System
export const VIP_TIERS = [
  { name: 'Bronze', minPoints: 0, multiplier: 1.0 },
  { name: 'Silver', minPoints: 1000, multiplier: 1.2 },
  { name: 'Gold', minPoints: 5000, multiplier: 1.5 },
  { name: 'Platinum', minPoints: 15000, multiplier: 2.0 },
  { name: 'Diamond', minPoints: 50000, multiplier: 3.0 },
];

@Injectable()
export class PlayerVipService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Get VIP points balance and tier
   */
  async getVipPoints(playerId: string, clubId: string) {
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

      // Calculate VIP points (example: based on total spent)
      const totalSpent = Number(player.totalSpent) || 0;
      const vipPoints = Math.floor(totalSpent * 0.1); // 1 point per ₹10 spent

      // Determine tier
      const tier = this.getVipTier(vipPoints);
      const nextTier = this.getNextTier(vipPoints);

      return {
        vipPoints,
        tier: tier.name,
        multiplier: tier.multiplier,
        nextTier: nextTier ? {
          name: nextTier.name,
          pointsRequired: nextTier.minPoints,
          pointsToNext: nextTier.minPoints - vipPoints,
        } : null,
        allTiers: VIP_TIERS,
      };
    } catch (err) {
      console.error('Get VIP points error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get VIP points');
    }
  }

  /**
   * Get club points balance
   */
  async getClubPoints(playerId: string, clubId: string) {
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

      // Calculate club points (example: based on games played)
      const clubPoints = Math.floor(Math.random() * 1000); // Placeholder

      return {
        clubPoints,
        playerId,
        clubId,
        clubName: player.club.name,
      };
    } catch (err) {
      console.error('Get club points error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get club points');
    }
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards(clubId: string) {
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

      // Sample rewards
      const rewards = [
        {
          id: 'reward-1',
          name: 'Free Tournament Entry',
          pointsCost: 500,
          description: 'Enter any tournament for free',
          available: true,
        },
        {
          id: 'reward-2',
          name: '₹100 Bonus',
          pointsCost: 1000,
          description: 'Get ₹100 added to your balance',
          available: true,
        },
        {
          id: 'reward-3',
          name: 'VIP Lounge Access',
          pointsCost: 2000,
          description: '1-month access to VIP lounge',
          available: true,
        },
      ];

      return {
        rewards,
        total: rewards.length,
      };
    } catch (err) {
      console.error('Get rewards error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get rewards');
    }
  }

  /**
   * Redeem VIP points for rewards
   */
  async redeemPoints(
    playerId: string,
    clubId: string,
    rewardId: string,
    pointsToRedeem: number,
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

      // Check if player has enough points
      const totalSpent = Number(player.totalSpent) || 0;
      const vipPoints = Math.floor(totalSpent * 0.1);

      if (vipPoints < pointsToRedeem) {
        throw new BadRequestException('Insufficient VIP points');
      }

      // Redeem points logic (would update a separate points ledger)
      return {
        success: true,
        message: 'Points redeemed successfully',
        rewardId,
        pointsRedeemed: pointsToRedeem,
        remainingPoints: vipPoints - pointsToRedeem,
        redeemedAt: new Date().toISOString(),
      };
    } catch (err) {
      console.error('Redeem points error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to redeem points');
    }
  }

  /**
   * Get VIP tier based on points
   */
  private getVipTier(points: number) {
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
      if (points >= VIP_TIERS[i].minPoints) {
        return VIP_TIERS[i];
      }
    }
    return VIP_TIERS[0]; // Bronze
  }

  /**
   * Get next VIP tier
   */
  private getNextTier(points: number) {
    for (let i = 0; i < VIP_TIERS.length; i++) {
      if (points < VIP_TIERS[i].minPoints) {
        return VIP_TIERS[i];
      }
    }
    return null; // Already at highest tier
  }
}













