import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SuspendStaffDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  reason!: string;
}

