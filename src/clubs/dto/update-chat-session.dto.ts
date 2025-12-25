import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ChatSessionStatus } from '../entities/chat-session.entity';

export class UpdateChatSessionDto {
  @IsOptional()
  @IsEnum(ChatSessionStatus)
  status?: ChatSessionStatus;

  @IsOptional()
  @IsUUID()
  assignedStaffId?: string;
}

