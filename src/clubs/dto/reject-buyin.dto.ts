import { IsString, IsNotEmpty } from 'class-validator';

export class RejectBuyInDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}







