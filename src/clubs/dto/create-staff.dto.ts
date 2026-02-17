import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength, MinLength, IsEmail, IsNumber, Min } from 'class-validator';
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

  @IsNotEmpty({ message: 'Aadhar document is required' })
  @IsString()
  aadharDocumentUrl!: string;

  @IsNotEmpty({ message: 'PAN document is required' })
  @IsString()
  panDocumentUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  customRoleName?: string;

  @IsOptional()
  @IsString()
  gameType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseSalary?: number;

  @IsOptional()
  @IsString()
  salaryType?: string; // 'Monthly' or 'Weekly'
}

