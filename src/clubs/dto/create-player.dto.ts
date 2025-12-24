import { IsNotEmpty, IsString, IsOptional, IsEmail, MaxLength, IsNumber, Min } from 'class-validator';

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

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referredBy?: string; // Referrer name/agent

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentType?: string; // Aadhaar, PAN, Passport, etc.

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  documentUrl?: string; // URL to KYC document

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number; // Initial balance for the player
}

























