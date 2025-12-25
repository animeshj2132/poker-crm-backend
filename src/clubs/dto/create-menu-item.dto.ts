import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, IsEnum } from 'class-validator';
import { MenuItemAvailability } from '../entities/menu-item.entity';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @IsOptional()
  @IsBoolean()
  isCustomCategory?: boolean;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(MenuItemAvailability)
  availability?: MenuItemAvailability;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl3?: string;
}












