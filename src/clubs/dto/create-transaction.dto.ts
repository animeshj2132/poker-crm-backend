import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, MaxLength, Min } from 'class-validator';
import { TransactionType } from '../entities/financial-transaction.entity';

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  playerId!: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  playerName!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

