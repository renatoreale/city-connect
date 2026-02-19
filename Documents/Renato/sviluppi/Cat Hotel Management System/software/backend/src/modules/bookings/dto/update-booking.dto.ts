import { IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
