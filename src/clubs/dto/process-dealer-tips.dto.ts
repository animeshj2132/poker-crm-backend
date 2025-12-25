import { IsUUID, IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';

export class ProcessDealerTipsDto {
  @IsUUID()
  dealerId!: string;

  @IsDateString()
  tipDate!: string;

  @IsNumber()
  @Min(0)
  totalTips!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

