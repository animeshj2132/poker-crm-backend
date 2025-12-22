import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class CreateClubWithBrandingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Branding fields
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'logoUrl must be a URL' })
  @MaxLength(2048)
  logoUrl?: string;

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

  @IsEmail()
  @IsNotEmpty()
  superAdminEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  superAdminDisplayName?: string;
}

