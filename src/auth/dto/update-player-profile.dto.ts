import { IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator';

export class UpdatePlayerProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^[\+]?[0-9\s\-\(\)]+$/, { message: 'Phone number contains invalid characters' })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nickname?: string;
}
















