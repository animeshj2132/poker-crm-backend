import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { VipProduct } from '../clubs/entities/vip-product.entity';
import { VipPurchase } from '../clubs/entities/vip-purchase.entity';
import { ClubsService } from '../clubs/clubs.service';

export const VIP_TIERS = [
  { name: 'Bronze', minPoints: 0, multiplier: 1.0, color: '#CD7F32' },
  { name: 'Silver', minPoints: 1000, multiplier: 1.2, color: '#C0C0C0' },
  { name: 'Gold', minPoints: 5000, multiplier: 1.5, color: '#FFD700' },
  { name: 'Platinum', minPoints: 15000, multiplier: 2.0, color: '#E5E4E2' },
  { name: 'Diamond', minPoints: 50000, multiplier: 3.0, color: '#B9F2FF' },
];

const WEIGHT_HOURS = 0.4;
const WEIGHT_MONEY = 0.6;

@Injectable()
export class PlayerVipService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    @InjectRepository(VipProduct)
    private readonly vipProductsRepo: Repository<VipProduct>,
    @InjectRepository(VipPurchase)
    private readonly vipPurchasesRepo: Repository<VipPurchase>,
    private readonly dataSource: DataSource,
    private readonly clubsService: ClubsService,
  ) {}

  private validateUuid(id: string, label: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new BadRequestException(`Invalid ${label} format`);
    }
  }

  /**
   * Calculate real playtime hours from table sessions + tournament sessions
   */
  private async calculateTotalHours(playerId: string, clubId: string): Promise<{ tableHours: number; tournamentHours: number; totalHours: number }> {
    // Table session hours from waitlist_entries
    const tableResult = await this.dataSource.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN status = 'SEATED' AND seated_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - seated_at)) / 3600.0
          WHEN seated_at IS NOT NULL AND updated_at > seated_at THEN 
            EXTRACT(EPOCH FROM (updated_at - seated_at)) / 3600.0
          ELSE 0
        END
      ), 0) AS total_hours
      FROM waitlist_entries
      WHERE player_id = $1 AND club_id = $2 AND seated_at IS NOT NULL
    `, [playerId, clubId]);

    const tableHours = Math.max(0, parseFloat(tableResult[0]?.total_hours) || 0);

    // Tournament session hours from tournament_players
    const tournamentResult = await this.dataSource.query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN tp.exited_at IS NOT NULL AND tp.session_started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (tp.exited_at - tp.session_started_at)) / 3600.0
          WHEN tp.busted_at IS NOT NULL AND tp.session_started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (tp.busted_at - tp.session_started_at)) / 3600.0
          WHEN tp.is_active = true AND tp.session_started_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - tp.session_started_at)) / 3600.0
          WHEN tp.exited_at IS NOT NULL AND tp.registered_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (tp.exited_at - tp.registered_at)) / 3600.0
          ELSE 0
        END
      ), 0) AS total_hours
      FROM tournament_players tp
      JOIN tournaments t ON tp.tournament_id = t.id
      WHERE tp.player_id = $1 AND t.club_id = $2
    `, [playerId, clubId]);

    const tournamentHours = Math.max(0, parseFloat(tournamentResult[0]?.total_hours) || 0);

    return {
      tableHours: Math.round(tableHours * 100) / 100,
      tournamentHours: Math.round(tournamentHours * 100) / 100,
      totalHours: Math.round((tableHours + tournamentHours) * 100) / 100,
    };
  }

  /**
   * Calculate total money spent (buy-ins) from financial_transactions
   */
  private async calculateTotalMoneySpent(playerId: string, clubId: string): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_spent
      FROM financial_transactions
      WHERE player_id = $1 AND club_id = $2
        AND UPPER(status) = 'COMPLETED'
        AND UPPER(type) IN ('BUY IN', 'TABLE BUY IN', 'CLUB BUY IN')
    `, [playerId, clubId]);

    return Math.max(0, parseFloat(result[0]?.total_spent) || 0);
  }

  /**
   * Calculate total points already spent on VIP purchases
   */
  private async getPointsSpent(playerId: string, clubId: string): Promise<number> {
    const result = await this.dataSource.query(`
      SELECT COALESCE(SUM(points_spent), 0) AS total_spent
      FROM vip_purchases
      WHERE player_id = $1 AND club_id = $2 AND status = 'completed'
    `, [playerId, clubId]);

    return parseInt(result[0]?.total_spent) || 0;
  }

  /**
   * Weighted VIP Points Formula:
   * VIP Points = (Wh × Hscore) + (Wm × Mscore)
   * Wh = 0.4 (40% weight for hours)
   * Wm = 0.6 (60% weight for money)
   * Hscore = total hours played (tables + tournaments)
   * Mscore = total money spent on buy-ins (in hundreds, so ₹1000 = 10 score)
   */
  async getVipPoints(playerId: string, clubId: string) {
    try {
      this.validateUuid(playerId, 'player ID');
      this.validateUuid(clubId, 'club ID');

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      const hours = await this.calculateTotalHours(playerId, clubId);
      const totalMoneySpent = await this.calculateTotalMoneySpent(playerId, clubId);
      const pointsSpent = await this.getPointsSpent(playerId, clubId);

      // Hscore = total hours played (1 hour = 1 score point)
      const hoursScore = hours.totalHours;
      // Mscore = money spent in hundreds (₹100 = 1 score point)
      const moneyScore = totalMoneySpent / 100;

      const earnedPoints = Math.floor((WEIGHT_HOURS * hoursScore) + (WEIGHT_MONEY * moneyScore));
      const availablePoints = Math.max(0, earnedPoints - pointsSpent);

      const tier = this.getVipTier(earnedPoints);
      const nextTier = this.getNextTier(earnedPoints);

      return {
        earnedPoints,
        availablePoints,
        pointsSpent,
        tier: tier.name,
        tierColor: tier.color,
        multiplier: tier.multiplier,
        nextTier: nextTier ? {
          name: nextTier.name,
          pointsRequired: nextTier.minPoints,
          pointsToNext: nextTier.minPoints - earnedPoints,
        } : null,
        breakdown: {
          tableHours: hours.tableHours,
          tournamentHours: hours.tournamentHours,
          totalHours: hours.totalHours,
          hoursScore: Math.round(hoursScore * 100) / 100,
          totalMoneySpent: Math.round(totalMoneySpent * 100) / 100,
          moneyScore: Math.round(moneyScore * 100) / 100,
          weightHours: WEIGHT_HOURS,
          weightMoney: WEIGHT_MONEY,
          hoursContribution: Math.floor(WEIGHT_HOURS * hoursScore),
          moneyContribution: Math.floor(WEIGHT_MONEY * moneyScore),
        },
        allTiers: VIP_TIERS,
      };
    } catch (err) {
      if (err instanceof BadRequestException || err instanceof NotFoundException || err instanceof ForbiddenException) {
        throw err;
      }
      console.error('Get VIP points error:', err);
      throw new BadRequestException('Failed to get VIP points');
    }
  }

  /**
   * Get VIP products available for purchase in this club
   */
  async getVipProducts(clubId: string) {
    this.validateUuid(clubId, 'club ID');

    const products = await this.vipProductsRepo.find({
      where: { club: { id: clubId }, isActive: true },
      order: { points: 'ASC' },
    });

    return products.map(p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      points: p.points,
      imageUrl: p.imageUrl,
      images: p.images || [],
      stock: p.stock,
    }));
  }

  /**
   * Purchase a VIP product
   */
  async purchaseProduct(playerId: string, clubId: string, productId: string) {
    this.validateUuid(playerId, 'player ID');
    this.validateUuid(clubId, 'club ID');
    this.validateUuid(productId, 'product ID');

    const player = await this.playersRepo.findOne({
      where: { id: playerId, club: { id: clubId } },
      relations: ['club'],
    });
    if (!player) throw new NotFoundException('Player not found');

    const product = await this.vipProductsRepo.findOne({
      where: { id: productId, club: { id: clubId }, isActive: true },
    });
    if (!product) throw new NotFoundException('VIP product not found or inactive');

    if (product.stock !== null && product.stock <= 0) {
      throw new BadRequestException('This product is out of stock');
    }

    // Calculate available points
    const vipData = await this.getVipPoints(playerId, clubId);
    if (vipData.availablePoints < product.points) {
      throw new BadRequestException(
        `Not enough VIP points. You have ${vipData.availablePoints} points but need ${product.points}.`
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create purchase record
      await queryRunner.query(
        `INSERT INTO vip_purchases (club_id, player_id, product_id, product_title, points_spent, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'completed', NOW(), NOW())`,
        [clubId, playerId, productId, product.title, product.points]
      );

      // Decrease stock if tracked
      if (product.stock !== null && product.stock > 0) {
        await queryRunner.query(
          `UPDATE vip_products SET stock = GREATEST(0, stock - 1), updated_at = NOW() WHERE id = $1`,
          [productId]
        );
      }

      // Audit log
      try {
        await queryRunner.query(
          `INSERT INTO audit_logs (club_id, staff_name, staff_role, action_type, action_category, description, target_type, target_id, target_name, metadata, created_at)
           VALUES ($1, $2, 'Player', 'vip_purchase', 'FINANCIAL', $3, 'vip_product', $4, $5, $6, NOW())`,
          [
            clubId,
            player.name || 'Player',
            `Player ${player.name} purchased VIP product "${product.title}" for ${product.points} points`,
            productId,
            product.title,
            JSON.stringify({ playerId, playerName: player.name, productTitle: product.title, pointsSpent: product.points }),
          ]
        );
      } catch (e) {
        console.error('Audit log error (non-fatal):', e);
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        message: `Successfully purchased "${product.title}" for ${product.points} VIP points`,
        purchase: {
          productTitle: product.title,
          pointsSpent: product.points,
          remainingPoints: vipData.availablePoints - product.points,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException || error instanceof NotFoundException) throw error;
      console.error('Purchase error:', error);
      throw new BadRequestException('Failed to purchase VIP product');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get purchase history for a player
   */
  async getPurchaseHistory(playerId: string, clubId: string) {
    this.validateUuid(playerId, 'player ID');
    this.validateUuid(clubId, 'club ID');

    const purchases = await this.dataSource.query(`
      SELECT vp.id, vp.product_title, vp.points_spent, vp.status, vp.created_at,
             p.title as current_product_title, p.images, p.image_url
      FROM vip_purchases vp
      LEFT JOIN vip_products p ON vp.product_id = p.id
      WHERE vp.player_id = $1 AND vp.club_id = $2
      ORDER BY vp.created_at DESC
    `, [playerId, clubId]);

    return purchases.map((p: any) => ({
      id: p.id,
      productTitle: p.product_title,
      pointsSpent: p.points_spent,
      status: p.status,
      createdAt: p.created_at,
      images: p.images || [],
      imageUrl: p.image_url,
    }));
  }

  /**
   * Get all VIP purchases for a club (admin view)
   */
  async getClubPurchases(clubId: string, page = 1, limit = 10) {
    this.validateUuid(clubId, 'club ID');

    const offset = (page - 1) * limit;

    const [purchases, countResult] = await Promise.all([
      this.dataSource.query(`
        SELECT vp.id, vp.product_title, vp.points_spent, vp.status, vp.created_at,
               pl.name as player_name, pl.phone as player_phone
        FROM vip_purchases vp
        JOIN players pl ON vp.player_id = pl.id
        WHERE vp.club_id = $1
        ORDER BY vp.created_at DESC
        LIMIT $2 OFFSET $3
      `, [clubId, limit, offset]),
      this.dataSource.query(`
        SELECT COUNT(*) as total FROM vip_purchases WHERE club_id = $1
      `, [clubId]),
    ]);

    return {
      purchases,
      total: parseInt(countResult[0]?.total) || 0,
      page,
      limit,
    };
  }

  private getVipTier(points: number) {
    for (let i = VIP_TIERS.length - 1; i >= 0; i--) {
      if (points >= VIP_TIERS[i].minPoints) return VIP_TIERS[i];
    }
    return VIP_TIERS[0];
  }

  private getNextTier(points: number) {
    for (const tier of VIP_TIERS) {
      if (points < tier.minPoints) return tier;
    }
    return null;
  }
}
