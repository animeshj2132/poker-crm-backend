import { IsString, IsArray, IsBoolean, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

export class UpdateRosterTemplateDto {
  @IsOptional()
  @IsString()
  staffName?: string;

  @IsOptional()
  @IsString()
  staffRole?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  offDays?: number[];

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Default shift start time must be in HH:MM or HH:MM:SS format'
  })
  defaultShiftStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Default shift end time must be in HH:MM or HH:MM:SS format'
  })
  defaultShiftEndTime?: string;

  @IsOptional()
  @IsBoolean()
  shiftCrossesMidnight?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
