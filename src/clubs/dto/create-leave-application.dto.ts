import { IsDateString, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateLeaveApplicationDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  reason!: string;
}

