import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerPlaytimeController } from './player-playtime.controller';
import { PlayerPlaytimeService } from './player-playtime.service';
import { Player } from '../clubs/entities/player.entity';
import { WaitlistEntry } from '../clubs/entities/waitlist-entry.entity';
import { Table } from '../clubs/entities/table.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player, WaitlistEntry, Table]), ClubsModule],
  controllers: [PlayerPlaytimeController],
  providers: [PlayerPlaytimeService],
  exports: [PlayerPlaytimeService],
})
export class PlayerPlaytimeModule {}














