import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateClubStatusDto {
  @IsString()
  @IsIn(['active', 'suspended', 'killed'])
  status!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

