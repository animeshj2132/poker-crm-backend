import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CancelTransactionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

