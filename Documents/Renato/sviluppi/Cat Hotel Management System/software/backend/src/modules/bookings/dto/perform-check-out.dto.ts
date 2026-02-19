import { IsOptional, IsString } from 'class-validator';

export class PerformCheckOutDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
