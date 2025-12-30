import { IsBoolean, IsNotEmpty } from 'class-validator';

export class ApproveFieldUpdateDto {
  @IsBoolean()
  @IsNotEmpty()
  approved!: boolean;
}









