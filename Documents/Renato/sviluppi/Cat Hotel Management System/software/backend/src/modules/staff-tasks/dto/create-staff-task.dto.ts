import { IsString, IsOptional, IsUUID, IsDateString, Matches } from 'class-validator';

export class CreateStaffTaskDto {
  @IsUUID()
  taskTypeId: string;

  /**
   * Prenotazione collegata (opzionale).
   */
  @IsOptional()
  @IsUUID()
  bookingId?: string;

  /**
   * Operatore a cui assegnare il compito (opzionale, può essere assegnato in seguito).
   */
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;

  /**
   * Data di scadenza del compito (ISO date: YYYY-MM-DD).
   */
  @IsDateString()
  dueDate: string;

  /**
   * Ora di scadenza opzionale (HH:MM).
   */
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]\d|2[0-3]):[0-5]\d$/, { message: 'dueTime deve essere nel formato HH:MM' })
  dueTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
