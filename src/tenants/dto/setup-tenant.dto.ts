import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';

export class SetupTenantDto {
  // Club information
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  clubName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clubDescription?: string;

  // Club branding - Logo URL is MANDATORY
  @IsNotEmpty()
  @IsUrl({ require_tld: false }, { message: 'logoUrl must be a URL' })
  @MaxLength(2048)
  logoUrl!: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'videoUrl must be a URL' })
  @MaxLength(2048)
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'skinColor must be hex like #RRGGBB' })
  skinColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  gradient?: string;

  // Super Admin information
  @IsEmail()
  @IsNotEmpty()
  superAdminEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  superAdminDisplayName?: string;

  // Password is now auto-generated, no longer required
}

