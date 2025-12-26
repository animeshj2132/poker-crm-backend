import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectPlayerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}



