import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AssignSeatDto {
  @IsUUID()
  @IsNotEmpty()
  tableId!: string;

  @IsString()
  @IsNotEmpty()
  seatedBy!: string; // User ID
}

