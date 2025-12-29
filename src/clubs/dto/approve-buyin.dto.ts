import { IsNumber, IsOptional, Min } from 'class-validator';

export class ApproveBuyInDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;
}






