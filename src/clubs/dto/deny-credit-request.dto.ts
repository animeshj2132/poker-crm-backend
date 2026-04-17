import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DenyCreditRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Rejection reason is too long' })
  reason?: string;
}
