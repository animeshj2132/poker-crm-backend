import { IsDateString, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateShiftDto {
  @IsOptional()
  @IsDateString()
  shiftDate?: string;

  @IsOptional()
  @IsDateString()
  shiftStartTime?: string;

  @IsOptional()
  @IsDateString()
  shiftEndTime?: string;

  @IsOptional()
  @IsBoolean()
  isOffDay?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

