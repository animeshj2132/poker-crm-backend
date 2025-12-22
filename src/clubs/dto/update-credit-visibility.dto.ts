import { IsNotEmpty, IsBoolean } from 'class-validator';

export class UpdateCreditVisibilityDto {
  @IsNotEmpty()
  @IsBoolean()
  visible!: boolean;
}

