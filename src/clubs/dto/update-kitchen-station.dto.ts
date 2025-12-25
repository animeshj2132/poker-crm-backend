import { IsString, IsOptional, IsInt, IsBoolean, IsUUID } from 'class-validator';

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

  @IsUUID()
  @IsOptional()
  chefId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

