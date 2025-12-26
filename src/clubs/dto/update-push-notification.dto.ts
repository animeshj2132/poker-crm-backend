import { IsOptional, IsString, MaxLength, IsEnum, IsArray, IsDateString, IsBoolean } from 'class-validator';
import { NotificationTargetType } from '../entities/push-notification.entity';

export class UpdatePushNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

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
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}



