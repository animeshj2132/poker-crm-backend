import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class VerifyClubCodeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'Club code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Club code must be 6 digits' })
  code!: string;
}



























