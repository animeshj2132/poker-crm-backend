import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength, MinLength } from 'class-validator';
import { StaffRole } from '../entities/staff.entity';

export class CreateStaffDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsNotEmpty()
  @IsEnum(StaffRole)
  role!: StaffRole;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  employeeId?: string;
}

