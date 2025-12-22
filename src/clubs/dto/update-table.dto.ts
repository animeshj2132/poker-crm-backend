import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { TableStatus, TableType } from '../entities/table.entity';

export class UpdateTableDto {
  @IsEnum(TableType)
  @IsOptional()
  tableType?: TableType;

  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxSeats?: number;

  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;

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

  @IsString()
  @IsOptional()
  @MaxLength(200)
  reservedFor?: string;

  @IsDateString()
  @IsOptional()
  reservedUntil?: string;
}

