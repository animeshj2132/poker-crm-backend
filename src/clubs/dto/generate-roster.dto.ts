import { IsDateString, IsEnum, IsOptional, IsBoolean } from 'class-validator';

export enum RosterPeriodType {
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class GenerateRosterDto {
  @IsDateString()
  startDate!: string; // YYYY-MM-DD

  @IsEnum(RosterPeriodType)
  periodType!: RosterPeriodType;

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean; // If true, will delete existing shifts in the period and recreate

  @IsOptional()
  @IsBoolean()
  skipWeekends?: boolean; // If true, won't create shifts for Saturday and Sunday (unless staff specifically works those days)
}
