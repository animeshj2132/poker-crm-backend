import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateTournamentDto {
  @IsString()
  name!: string;

  @IsString()
  tournament_type!: string;

  @IsNumber()
  buy_in!: number;

  @IsOptional()
  @IsNumber()
  entry_fee?: number;

  @IsNumber()
  starting_chips!: number;

  @IsString()
  blind_structure!: string;

  @IsOptional()
  @IsNumber()
  number_of_levels?: number;

  @IsOptional()
  @IsNumber()
  minutes_per_level?: number;

  @IsOptional()
  @IsString()
  break_structure?: string;

  @IsOptional()
  @IsNumber()
  break_duration?: number;

  @IsOptional()
  @IsNumber()
  late_registration?: number;

  @IsOptional()
  @IsString()
  payout_structure?: string;

  @IsOptional()
  @IsString()
  seat_draw_method?: string;

  @IsOptional()
  @IsString()
  clock_pause_rules?: string;

  @IsOptional()
  @IsBoolean()
  allow_rebuys?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_addon?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_reentry?: boolean;

  @IsOptional()
  @IsNumber()
  bounty_amount?: number;

  @IsOptional()
  @IsNumber()
  max_players?: number;

  @IsOptional()
  start_time?: Date;

  @IsOptional()
  @IsString()
  custom_tournament_type?: string;

  @IsOptional()
  @IsString()
  custom_blind_structure?: string;

  @IsOptional()
  @IsString()
  custom_break_structure?: string;

  @IsOptional()
  @IsString()
  custom_payout_structure?: string;

  @IsOptional()
  @IsString()
  custom_seat_draw_method?: string;

  @IsOptional()
  @IsString()
  custom_clock_pause_rules?: string;

  // Rummy-specific fields (optional)
  @IsOptional()
  @IsString()
  rummy_variant?: string;

  @IsOptional()
  @IsNumber()
  number_of_deals?: number;

  @IsOptional()
  @IsNumber()
  points_per_deal?: number;

  @IsOptional()
  @IsNumber()
  drop_points?: number;

  @IsOptional()
  @IsNumber()
  max_points?: number;

  @IsOptional()
  @IsNumber()
  deal_duration?: number;

  @IsOptional()
  @IsNumber()
  prize_pool?: number;

  @IsOptional()
  @IsNumber()
  min_players?: number;
}

