import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class PlayerLoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Club code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Club code must be 6 digits' })
  clubCode!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}




























