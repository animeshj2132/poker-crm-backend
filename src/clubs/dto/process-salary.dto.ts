import { IsUUID, IsEnum, IsNumber, IsDateString, IsOptional, IsString, Min } from 'class-validator';
import { PayPeriod } from '../entities/salary-payment.entity';

export class ProcessSalaryDto {
  @IsUUID()
  staffId!: string;

  @IsEnum(PayPeriod)
  payPeriod!: PayPeriod;

  @IsNumber()
  @Min(0)
  baseSalary!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  overtimeAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsDateString()
  periodStartDate!: string;

  @IsDateString()
  periodEndDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

