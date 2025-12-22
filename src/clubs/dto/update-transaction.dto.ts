import { IsOptional, IsNumber, IsString, IsEnum, MaxLength, Min } from 'class-validator';
import { TransactionStatus } from '../entities/financial-transaction.entity';

export class UpdateTransactionDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01, { message: 'Amount must be greater than 0' })
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;
}

