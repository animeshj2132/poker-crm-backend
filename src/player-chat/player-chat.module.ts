import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerChatController } from './player-chat.controller';
import { PlayerChatService } from './player-chat.service';
import { Player } from '../clubs/entities/player.entity';
import { ChatSession } from '../clubs/entities/chat-session.entity';
import { ChatMessage } from '../clubs/entities/chat-message.entity';
import { Club } from '../clubs/club.entity';
import { ClubsModule } from '../clubs/clubs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Player, ChatSession, ChatMessage, Club]),
    ClubsModule
  ],
  controllers: [PlayerChatController],
  providers: [PlayerChatService],
  exports: [PlayerChatService],
})
export class PlayerChatModule {}







