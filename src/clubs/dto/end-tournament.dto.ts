import { IsArray, ValidateNested, IsUUID, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class WinnerDto {
  @IsUUID()
  player_id!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  finishing_position!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prize_amount!: number;
}

export class EndTournamentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WinnerDto)
  winners!: WinnerDto[];
}

