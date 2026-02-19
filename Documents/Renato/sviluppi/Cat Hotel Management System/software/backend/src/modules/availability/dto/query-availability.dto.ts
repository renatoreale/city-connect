import { IsDateString } from 'class-validator';

export class QueryAvailabilityDto {
  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;
}
