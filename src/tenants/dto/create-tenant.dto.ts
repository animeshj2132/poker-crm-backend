import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  superAdminName!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(200)
  superAdminEmail!: string;
}



