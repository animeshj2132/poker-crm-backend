import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../entities/fnb-order.entity';

export class UpdateFnbOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  processedBy?: string;

  @IsOptional()
  @IsBoolean()
  sentToChef?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  chefAssigned?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialInstructions?: string;
}







