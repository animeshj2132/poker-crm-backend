import { IsOptional, IsString, IsInt, Min, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRakeCollectionsDto {
  @IsOptional()
  @ValidateIf((o) => o.startDate !== '' && o.startDate !== null && o.startDate !== undefined)
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @ValidateIf((o) => o.endDate !== '' && o.endDate !== null && o.endDate !== undefined)
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  tableId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

