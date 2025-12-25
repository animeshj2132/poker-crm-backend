import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../entities/fnb-order.entity';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateFnbOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  playerName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  playerId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  tableNumber!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;
}












