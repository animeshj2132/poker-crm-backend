import { IsNotEmpty, IsString, IsOptional, MaxLength, IsEnum, IsArray, IsDateString, IsBoolean } from 'class-validator';
import { NotificationTargetType, NotificationType } from '../entities/push-notification.entity';

export class CreatePushNotificationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  details?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoUrl?: string;

  @IsOptional()
  @IsEnum(NotificationTargetType)
  targetType?: NotificationTargetType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customPlayerIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customStaffIds?: string[];

  @IsOptional()
  @IsEnum(NotificationType)
  notificationType?: NotificationType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}



