import { IsNumber, IsOptional, IsBoolean, IsString, Min, Max } from 'class-validator';

export class UpdateTenantSettingsDto {
  // Configurazioni sanitarie
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  fivFelvValidityMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(120)
  vaccinationValidityMonths?: number;

  // Configurazioni prenotazioni
  @IsOptional()
  @IsString()
  defaultCheckInTime?: string;

  @IsOptional()
  @IsString()
  defaultCheckOutTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minBookingDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxBookingDays?: number;

  // Configurazioni preventivi
  @IsOptional()
  @IsNumber()
  @Min(1)
  quoteValidityDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  checkinPaymentPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  checkoutPaymentPercentage?: number;

  // Configurazioni pool gabbie
  @IsOptional()
  @IsNumber()
  @Min(0)
  numSingole?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  numDoppie?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(30)
  cageOccupancyDays?: number;

  // Configurazioni appuntamenti
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  checkInMaxPerSlot?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  checkOutMaxPerSlot?: number;

  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(120)
  appointmentSlotDuration?: number;

  // Configurazioni email appuntamenti
  @IsOptional()
  @IsBoolean()
  sendAppointmentConfirmation?: boolean;

  @IsOptional()
  @IsBoolean()
  sendAppointmentReminder?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  appointmentReminderHours?: number;

  // Configurazioni check-in / check-out (Block 10)
  @IsOptional()
  @IsBoolean()
  requireCheckinPaymentAtCheckin?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCheckoutPaymentAtCheckout?: boolean;

  // Configurazioni notifiche
  @IsOptional()
  @IsBoolean()
  sendBookingConfirmation?: boolean;

  @IsOptional()
  @IsBoolean()
  sendCheckInReminder?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  checkInReminderDays?: number;

  // Configurazioni cat taxi
  @IsOptional()
  @IsNumber()
  @Min(1)
  taxiBaseKm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxiBasePrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  taxiExtraKmPrice?: number;
}
