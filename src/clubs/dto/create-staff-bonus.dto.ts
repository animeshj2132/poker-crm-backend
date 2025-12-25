import { IsString, IsNumber, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateStaffBonusDto {
  @IsUUID()
  @IsNotEmpty()
  staffId!: string;

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

