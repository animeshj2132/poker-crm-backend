import { IsNotEmpty, IsString, IsOptional, IsEmail, MaxLength } from 'class-validator';

export class CreatePlayerDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  @MaxLength(200)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  playerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  affiliateCode?: string; // Affiliate code used for signup

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}





















