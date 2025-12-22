import { IsNotEmpty } from 'class-validator';

export class SetClubSettingDto {
  @IsNotEmpty()
  value!: string | Record<string, unknown>;
}

