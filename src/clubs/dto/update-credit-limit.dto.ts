import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateCreditLimitDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0, { message: 'Limit must be greater than or equal to 0' })
  limit!: number;
}

