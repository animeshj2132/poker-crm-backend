import { IsNumber, Min, Max } from 'class-validator';

export class UpdateTipSettingsDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  clubHoldPercentage!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  dealerSharePercentage!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  floorManagerPercentage!: number;
}

