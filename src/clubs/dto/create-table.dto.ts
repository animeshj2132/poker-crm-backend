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
}

