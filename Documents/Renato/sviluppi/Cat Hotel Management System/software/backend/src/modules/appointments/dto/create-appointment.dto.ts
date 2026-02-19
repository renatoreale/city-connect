import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ScheduleType } from '../entities/appointment-weekly-schedule.entity';

export class CreateAppointmentDto {
  @IsUUID()
  bookingId: string;

  @IsEnum(ScheduleType)
  appointmentType: ScheduleType;

  @IsDateString()
  appointmentDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime deve essere nel formato HH:mm' })
  startTime: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
