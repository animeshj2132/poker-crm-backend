import { IsEnum, IsOptional, IsString, IsDateString, IsArray, IsUUID } from 'class-validator';

export enum ReportType {
  INDIVIDUAL_PLAYER = 'individual_player',
  CUMULATIVE_PLAYER = 'cumulative_player',
  DAILY_TRANSACTIONS = 'daily_transactions',
  DAILY_RAKE = 'daily_rake',
  PER_TABLE_TRANSACTIONS = 'per_table_transactions',
  CREDIT_TRANSACTIONS = 'credit_transactions',
  EXPENSES = 'expenses',
  BONUS = 'bonus',
  CUSTOM = 'custom'
}

export enum ReportFormat {
  EXCEL = 'excel',
  PDF = 'pdf'
}

export class GenerateReportDto {
  @IsEnum(ReportType)
  reportType!: ReportType;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsEnum(ReportFormat)
  format!: ReportFormat;

  // For Individual Player Report
  @IsOptional()
  @IsUUID()
  playerId?: string;

  // For Per Table Transactions Report
  @IsOptional()
  @IsString()
  tableNumber?: string;

  // For Custom Report
  @IsOptional()
  @IsArray()
  @IsEnum(ReportType, { each: true })
  customReportTypes?: ReportType[];
}

