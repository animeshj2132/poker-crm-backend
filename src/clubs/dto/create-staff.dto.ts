import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength, MinLength, IsEmail } from 'class-validator';
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

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone!: string;

  @IsOptional()
  @IsString()
  aadharDocumentUrl?: string;

  @IsOptional()
  @IsString()
  panDocumentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customRoleName?: string; // Required when role is STAFF
}

