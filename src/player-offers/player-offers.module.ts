import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerOffersController } from './player-offers.controller';
import { PlayerOffersService } from './player-offers.service';
import { Player } from '../clubs/entities/player.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), ClubsModule],
  controllers: [PlayerOffersController],
  providers: [PlayerOffersService],
  exports: [PlayerOffersService],
})
export class PlayerOffersModule {}







