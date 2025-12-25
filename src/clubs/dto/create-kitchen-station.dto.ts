import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean, IsUUID } from 'class-validator';

export class CreateKitchenStationDto {
  @IsString()
  @IsNotEmpty()
  stationName!: string;

  @IsInt()
  stationNumber!: number;

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

