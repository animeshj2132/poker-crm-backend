import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { StaffRole } from '../entities/staff.entity';

export class CreateLeavePolicyDto {
  @IsEnum(StaffRole)
  @IsNotEmpty()
  role!: StaffRole;

  @IsInt()
  @Min(0)
  leavesPerYear!: number;
}

