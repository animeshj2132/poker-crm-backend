import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerChatController } from './player-chat.controller';
import { PlayerChatService } from './player-chat.service';
import { Player } from '../clubs/entities/player.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Player]), ClubsModule],
  controllers: [PlayerChatController],
  providers: [PlayerChatService],
  exports: [PlayerChatService],
})
export class PlayerChatModule {}


