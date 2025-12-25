import { IsNotEmpty, IsUUID, IsDateString, IsOptional, IsString } from 'class-validator';

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
}

