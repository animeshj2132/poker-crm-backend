import { IsNotEmpty, IsString } from 'class-validator';

export class RejectBuyOutDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}







