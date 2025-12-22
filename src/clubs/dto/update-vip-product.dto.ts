import { IsOptional, IsString, IsNumber, MaxLength, Min, MinLength, IsUrl } from 'class-validator';

export class UpdateVipProductDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(1, { message: 'Points must be at least 1' })
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  @MaxLength(500)
  imageUrl?: string;
}

