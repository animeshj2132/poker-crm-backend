import { IsOptional, IsString } from 'class-validator';

export class ApproveRejectLeaveDto {
  @IsString()
  @IsOptional()
  rejectionReason?: string;
}

