import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TableType } from '../entities/table.entity';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  tableNumber!: number;

  @IsEnum(TableType)
  @IsNotEmpty()
  tableType!: TableType;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsNotEmpty()
  maxSeats!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  minBuyIn?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  maxBuyIn?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  // Rummy-specific fields (optional)
  @IsString()
  @IsOptional()
  @MaxLength(100)
  rummyVariant?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pointsValue?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  numberOfDeals?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  dropPoints?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  maxPoints?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  dealDuration?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  entryFee?: number;

  @IsInt()
  @Min(2)
  @Max(6)
  @IsOptional()
  minPlayers?: number;
}

