import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, MaxLength } from 'class-validator';

export class EditTransactionDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  reason!: string;
}

