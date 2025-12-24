import { IsNotEmpty, IsString, IsEmail, MaxLength, IsOptional, IsHexColor } from 'class-validator';

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

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;
}
