import { IsArray, ValidateNested, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class WinnerDto {
  @IsString()
  player_id!: string;

  @IsNumber()
  finishing_position!: number;

  @IsNumber()
  prize_amount!: number;
}

export class EndTournamentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WinnerDto)
  winners!: WinnerDto[];
}

