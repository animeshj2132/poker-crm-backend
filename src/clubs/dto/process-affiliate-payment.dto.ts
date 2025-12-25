import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { TransactionType } from '../entities/affiliate-transaction.entity';

export class ProcessAffiliatePaymentDto {
  @IsNotEmpty()
  @IsString()
  affiliateId!: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

