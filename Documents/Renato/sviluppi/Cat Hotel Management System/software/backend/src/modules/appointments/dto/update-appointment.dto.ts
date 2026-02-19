import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class UpdateAppointmentDto {
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime deve essere nel formato HH:mm' })
  startTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
