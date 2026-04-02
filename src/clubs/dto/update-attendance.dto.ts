import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAttendanceDto {
  @IsOptional()
  @IsDateString()
  loginTime?: string;

  @IsOptional()
  @IsDateString()
  logoutTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsNotEmpty()
  @IsString()
  editReason!: string;
}
