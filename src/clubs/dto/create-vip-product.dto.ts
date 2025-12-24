import { IsNotEmpty, IsString, IsNumber, IsOptional, MaxLength, Min, MinLength, IsArray, IsBoolean, ValidateNested, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

class ImageDto {
  @IsString()
  url!: string;
}

export class CreateVipProductDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1, { message: 'Points must be at least 1' })
  points!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => ImageDto)
  images?: ImageDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
