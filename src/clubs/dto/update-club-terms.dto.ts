import { IsString } from 'class-validator';

export class UpdateClubTermsDto {
  @IsString()
  termsAndConditions!: string;
}



