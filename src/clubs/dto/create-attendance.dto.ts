import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsString, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsUUID()
  staffId!: string;

  @IsNotEmpty()
  @IsDateString()
  date!: string;

  @IsNotEmpty()
  @IsDateString()
  loginTime!: string;

  @IsNotEmpty()
  @IsDateString()
  logoutTime!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  workedRosterOffDay?: boolean;
}

