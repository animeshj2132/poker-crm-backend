import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ApprovePlayerDto {
  @IsString()
  @MaxLength(500)
  notes?: string;
}

