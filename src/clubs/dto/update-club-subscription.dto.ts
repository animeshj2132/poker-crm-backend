import { IsNumber, IsOptional, IsString, IsIn, IsDateString } from 'class-validator';

export class UpdateClubSubscriptionDto {
  @IsOptional()
  @IsNumber()
  subscriptionPrice?: number;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'paused', 'cancelled'])
  subscriptionStatus?: string;

  @IsOptional()
  @IsDateString()
  lastPaymentDate?: string;

  @IsOptional()
  @IsString()
  subscriptionNotes?: string;
}







