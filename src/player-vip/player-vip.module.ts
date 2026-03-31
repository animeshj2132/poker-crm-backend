import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerVipController } from './player-vip.controller';
import { PlayerVipService } from './player-vip.service';
import { Player } from '../clubs/entities/player.entity';
import { VipProduct } from '../clubs/entities/vip-product.entity';
import { VipPurchase } from '../clubs/entities/vip-purchase.entity';
import { ClubsModule } from '../clubs/clubs.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Player, VipProduct, VipPurchase]),
    ClubsModule,
    EventsModule,
  ],
  controllers: [PlayerVipController],
  providers: [PlayerVipService],
  exports: [PlayerVipService],
})
export class PlayerVipModule {}
