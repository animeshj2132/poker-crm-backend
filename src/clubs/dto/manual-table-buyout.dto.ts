import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ManualTableBuyOutDto {
  @IsUUID()
  playerId!: string;

  @IsInt()
  @Min(1)
  tableNumber!: number;

  @IsNumber()
  @Min(0)
  @Max(100000000)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
