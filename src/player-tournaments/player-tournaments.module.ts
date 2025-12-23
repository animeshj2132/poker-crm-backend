import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerTournamentsController } from './player-tournaments.controller';
import { PlayerTournamentsService } from './player-tournaments.service';
import { Player } from '../clubs/entities/player.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), ClubsModule],
  controllers: [PlayerTournamentsController],
  providers: [PlayerTournamentsService],
  exports: [PlayerTournamentsService],
})
export class PlayerTournamentsModule {}


