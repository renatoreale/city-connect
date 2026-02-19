import { IsDateString, IsEnum } from 'class-validator';
import { ScheduleType } from '../entities/appointment-weekly-schedule.entity';

export class QueryAvailableSlotsDto {
  @IsDateString()
  date: string;

  @IsEnum(ScheduleType)
  appointmentType: ScheduleType;
}
