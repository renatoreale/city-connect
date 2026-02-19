import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DayOfWeek,
  ScheduleType,
} from '../entities/appointment-weekly-schedule.entity';

export class ScheduleEntryDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime deve essere nel formato HH:mm' })
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime deve essere nel formato HH:mm' })
  endTime: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpsertWeeklyScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleEntryDto)
  entries: ScheduleEntryDto[];
}
