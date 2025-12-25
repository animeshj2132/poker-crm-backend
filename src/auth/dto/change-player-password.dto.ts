import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePlayerPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Current password must be at least 8 characters' })
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(100)
  newPassword!: string;
}




















