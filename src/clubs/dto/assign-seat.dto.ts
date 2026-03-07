import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AssignSeatDto {
  @IsUUID()
  @IsNotEmpty()
  tableId!: string;

  @IsString()
  @IsNotEmpty()
  seatedBy!: string; // User ID

  /** Seat number actually assigned (e.g. 3). If omitted, requestedSeat is used. Hologram shows this. */
  @IsOptional()
  @IsInt()
  @Min(1)
  seatNumber?: number;
}

