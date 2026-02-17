import { IsNotEmpty, IsString, IsEmail, MaxLength, IsOptional, IsHexColor, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateTenantWithClubDto {
  // Tenant info
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  tenantName!: string;

  // Super Admin info
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  superAdminName!: string;

  @IsEmail()
  @IsNotEmpty()
  superAdminEmail!: string;

  // Club info
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  clubName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  clubDescription?: string;

  // Branding
  @IsHexColor()
  @IsOptional()
  skinColor?: string;

  @IsString()
  @IsOptional()
  gradient?: string;

  // Logo URL is optional - logo can be uploaded after club creation
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  logoUrl?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  videoUrl?: string;

  // Game access toggles
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  pokerEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  rummyEnabled?: boolean;
}
