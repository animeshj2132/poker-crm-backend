import { IsOptional, IsNumber, Min } from 'class-validator';

export class ApproveCreditDto {
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Limit must be greater than or equal to 0' })
  limit?: number;
}

