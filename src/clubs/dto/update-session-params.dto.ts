import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSessionParamsDto {
  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Minimum play time must be at least 30 minutes' })
  minPlayTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Call time must be at least 1 minute' })
  callTime?: number;

  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Cash-out window must be at least 1 minute' })
  cashOutWindow?: number;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Session timeout must be at least 30 minutes' })
  sessionTimeout?: number;
}







