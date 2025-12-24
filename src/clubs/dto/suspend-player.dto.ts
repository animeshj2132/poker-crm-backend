import { IsNotEmpty, IsString, MaxLength, IsEnum, IsOptional, ValidateIf } from 'class-validator';

export class SuspendPlayerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsEnum(['temporary', 'permanent'])
  type!: 'temporary' | 'permanent';

  @ValidateIf((o) => o.type === 'temporary')
  @IsOptional()
  @IsString()
  @MaxLength(100)
  duration?: string; // e.g. "7 days", "30 days" - only required for temporary suspensions
}

