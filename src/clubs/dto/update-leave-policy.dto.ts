import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateLeavePolicyDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  leavesPerYear?: number;
}

