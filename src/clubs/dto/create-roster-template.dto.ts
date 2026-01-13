import { IsUUID, IsString, IsArray, IsBoolean, IsOptional, IsInt, Min, Max, Matches } from 'class-validator';

export class CreateRosterTemplateDto {
  @IsUUID()
  staffId!: string;

  @IsString()
  staffName!: string;

  @IsString()
  staffRole!: string;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  offDays!: number[]; // Array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Default shift start time must be in HH:MM or HH:MM:SS format'
  })
  defaultShiftStartTime!: string; // HH:MM:SS format

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/, {
    message: 'Default shift end time must be in HH:MM or HH:MM:SS format'
  })
  defaultShiftEndTime!: string; // HH:MM:SS format

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
