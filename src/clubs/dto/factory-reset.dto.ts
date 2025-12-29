import { IsString, MinLength } from 'class-validator';

export class FactoryResetDto {
  @IsString()
  @MinLength(1)
  password!: string;

  @IsString()
  @MinLength(1)
  confirmationText!: string; // User must type "DELETE ALL DATA" to confirm
}






