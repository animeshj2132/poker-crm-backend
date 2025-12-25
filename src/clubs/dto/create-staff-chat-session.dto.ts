import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateStaffChatSessionDto {
  @IsUUID()
  @IsNotEmpty()
  recipientStaffId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;
}

