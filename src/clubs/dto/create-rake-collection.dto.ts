import { IsNotEmpty, IsString, IsNumber, IsOptional, IsDateString, IsUUID, Min } from 'class-validator';

export class CreateRakeCollectionDto {
  @IsNotEmpty()
  @IsUUID()
  tableId!: string;

  @IsNotEmpty()
  @IsDateString()
  sessionDate!: string; // ISO date string

  @IsOptional()
  @IsString()
  chipDenomination?: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  totalRakeAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

