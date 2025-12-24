import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerFeedbackController } from './player-feedback.controller';
import { PlayerFeedbackService } from './player-feedback.service';
import { Player } from '../clubs/entities/player.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), ClubsModule],
  controllers: [PlayerFeedbackController],
  providers: [PlayerFeedbackService],
  exports: [PlayerFeedbackService],
})
export class PlayerFeedbackModule {}





