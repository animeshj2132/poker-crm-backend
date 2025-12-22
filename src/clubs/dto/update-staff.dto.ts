import { IsOptional, IsString, IsEnum, MaxLength, MinLength } from 'class-validator';
import { StaffRole, StaffStatus } from '../entities/staff.entity';

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(StaffRole)
  role?: StaffRole;

  @IsOptional()
  @IsEnum(StaffStatus)
  status?: StaffStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;
}

