import { IsNotEmpty, IsString, MinLength, MaxLength, IsEmail } from 'class-validator';

export class PlayerResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  currentPassword!: string;  // Temporary password (for verification)

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(100)
  newPassword!: string;

  @IsString()
  @IsNotEmpty()
  clubCode!: string;
}

