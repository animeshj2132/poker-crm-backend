import { IsBoolean, IsObject, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'logoUrl must be a URL' })
  @MaxLength(2048)
  logoUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false }, { message: 'faviconUrl must be a URL' })
  @MaxLength(2048)
  faviconUrl?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'primaryColor must be hex like #RRGGBB' })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'secondaryColor must be hex like #RRGGBB' })
  secondaryColor?: string;

  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customDomain?: string;

  @IsOptional()
  @IsBoolean()
  whiteLabel?: boolean;
}

