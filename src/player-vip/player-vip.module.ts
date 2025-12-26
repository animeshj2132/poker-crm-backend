import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerVipController } from './player-vip.controller';
import { PlayerVipService } from './player-vip.service';
import { Player } from '../clubs/entities/player.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), ClubsModule],
  controllers: [PlayerVipController],
  providers: [PlayerVipService],
  exports: [PlayerVipService],
})
export class PlayerVipModule {}







