import { IsUUID, IsDateString, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  staffId!: string;

  @IsDateString()
  shiftDate!: string; // YYYY-MM-DD

  @IsDateString()
  shiftStartTime!: string; // ISO 8601 timestamp

  @IsDateString()
  shiftEndTime!: string; // ISO 8601 timestamp

  @IsOptional()
  @IsBoolean()
  isOffDay?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

