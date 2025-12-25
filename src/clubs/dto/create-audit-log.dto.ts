import { IsString, IsUUID, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum ActionCategory {
  PLAYER_MANAGEMENT = 'player_management',
  FINANCIAL = 'financial',
  TABLE_MANAGEMENT = 'table_management',
  STAFF_MANAGEMENT = 'staff_management',
  TOURNAMENT = 'tournament',
  BONUS = 'bonus',
  CREDIT = 'credit',
  FNB = 'fnb',
  SHIFT = 'shift',
  PAYROLL = 'payroll',
  OVERRIDE = 'override',
  SYSTEM = 'system',
}

export class CreateAuditLogDto {
  @IsUUID()
  clubId!: string;

  @IsUUID()
  @IsOptional()
  staffId?: string;

  @IsString()
  staffName!: string;

  @IsString()
  staffRole!: string;

  @IsString()
  actionType!: string;

  @IsEnum(ActionCategory)
  actionCategory!: ActionCategory;

  @IsString()
  description!: string;

  @IsString()
  @IsOptional()
  targetType?: string;

  @IsUUID()
  @IsOptional()
  targetId?: string;

  @IsString()
  @IsOptional()
  targetName?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsString()
  @IsOptional()
  userAgent?: string;
}

