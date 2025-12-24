import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangeStaffPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Current password must be at least 6 characters' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @MaxLength(100)
  newPassword!: string;
}

