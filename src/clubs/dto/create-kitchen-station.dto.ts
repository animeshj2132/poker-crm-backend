import { IsString, IsNotEmpty, IsInt, IsOptional, IsBoolean, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateKitchenStationDto {
  @IsString()
  @IsNotEmpty()
  stationName!: string;

  @IsInt()
  stationNumber!: number;

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

