import { IsOptional, IsNumber, Min } from 'class-validator';

export class ApproveBuyOutDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number; // If not provided, uses current table balance
}


