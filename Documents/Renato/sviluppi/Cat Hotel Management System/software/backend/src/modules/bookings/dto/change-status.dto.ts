import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '../entities/booking.entity';

export class ChangeStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
