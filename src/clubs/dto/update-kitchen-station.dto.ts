import { IsString, IsOptional, IsInt, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateKitchenStationDto {
  @IsString()
  @IsOptional()
  stationName?: string;

  @IsInt()
  @IsOptional()
  stationNumber?: number;

  @IsString()
  @IsOptional()
  chefName?: string;

  @Transform(({ value }) => value === '' || value === null ? undefined : value)
  @IsUUID()
  @IsOptional()
  chefId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

