import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerDocumentsController } from './player-documents.controller';
import { PlayerDocumentsService } from './player-documents.service';
import { Player } from '../clubs/entities/player.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), ClubsModule],
  controllers: [PlayerDocumentsController],
  providers: [PlayerDocumentsService],
  exports: [PlayerDocumentsService],
})
export class PlayerDocumentsModule {}


