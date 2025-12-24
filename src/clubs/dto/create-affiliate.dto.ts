import { IsNotEmpty, IsString, IsOptional, IsNumber, Min, Max, MaxLength, MinLength } from 'class-validator';

export class CreateAffiliateDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  email!: string; // User email to assign affiliate role

  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  code?: string; // Optional custom code, otherwise auto-generated

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number; // Commission percentage (0-100)
}
























