import { IsDateString, IsArray, IsUUID } from 'class-validator';

export class CheckAvailabilityDto {
  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsArray()
  @IsUUID('4', { each: true })
  catIds: string[];
}
