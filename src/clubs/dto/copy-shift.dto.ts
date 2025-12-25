import { IsUUID, IsDateString, IsArray, ArrayMinSize } from 'class-validator';

export class CopyShiftDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  shiftIds!: string[]; // Array of shift IDs to copy

  @IsArray()
  @ArrayMinSize(1)
  @IsDateString({}, { each: true })
  targetDates!: string[]; // Array of dates to copy to (YYYY-MM-DD)
}

