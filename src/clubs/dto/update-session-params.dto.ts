import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateSessionParamsDto {
  @IsOptional()
  @IsInt()
  @Min(0, { message: 'Minimum play time cannot be negative' })
  minPlayTime?: number; // Can be 0 = no minimum, player can call time immediately

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
  @Min(1, { message: 'Session timeout must be at least 1 minute' })
  sessionTimeout?: number;
}










