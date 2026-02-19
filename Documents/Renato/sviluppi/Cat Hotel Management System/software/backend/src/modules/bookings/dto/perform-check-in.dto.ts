import { IsOptional, IsString } from 'class-validator';

export class PerformCheckInDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
