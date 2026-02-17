import { IsUUID, IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';

export class ProcessManagerCashoutDto {
  @IsUUID()
  managerId!: string;

  @IsDateString()
  cashoutDate!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
