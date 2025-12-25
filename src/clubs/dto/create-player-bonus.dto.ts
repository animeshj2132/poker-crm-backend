import { IsString, IsNumber, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePlayerBonusDto {
  @IsUUID()
  @IsNotEmpty()
  playerId!: string;

  @IsString()
  @IsNotEmpty()
  bonusType!: string;

  @IsNumber()
  @Min(0)
  bonusAmount!: number;

  @IsString()
  @IsOptional()
  reason?: string;
}

