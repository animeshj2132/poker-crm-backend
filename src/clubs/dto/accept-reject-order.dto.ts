import { IsBoolean, IsString, IsOptional, IsUUID } from 'class-validator';

export class AcceptRejectOrderDto {
  @IsBoolean()
  isAccepted!: boolean;

  @IsUUID()
  @IsOptional()
  stationId?: string;

  @IsString()
  @IsOptional()
  rejectedReason?: string;

  @IsString()
  @IsOptional()
  processedBy?: string;
}

