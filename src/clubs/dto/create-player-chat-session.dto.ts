import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePlayerChatSessionDto {
  @IsUUID()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  subject!: string;
}

