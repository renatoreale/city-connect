import { IsString, IsOptional, IsUUID, IsDateString, Matches } from 'class-validator';

export class UpdateStaffTaskDto {
  @IsOptional()
  @IsUUID()
  taskTypeId?: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime deve essere nel formato HH:MM' })
  dueTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
