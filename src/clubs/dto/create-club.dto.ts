import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}



