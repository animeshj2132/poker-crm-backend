import { IsEmail, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpdateWaitlistEntryDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  playerName?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phoneNumber?: string;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  partySize?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  priority?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tableType?: string;
}

