import {
  Entity,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from './tenant.entity';

@Entity('tenant_settings')
export class TenantSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, unique: true })
  tenantId: string;

  @OneToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  // Configurazioni sanitarie
  @Column({ name: 'fiv_felv_validity_months', type: 'int', default: 12 })
  fivFelvValidityMonths: number;

  @Column({ name: 'vaccination_validity_months', type: 'int', default: 36 })
  vaccinationValidityMonths: number;

  // Configurazioni prenotazioni (per futuro)
  @Column({ name: 'default_check_in_time', type: 'time', nullable: true })
  defaultCheckInTime: string;

  @Column({ name: 'default_check_out_time', type: 'time', nullable: true })
  defaultCheckOutTime: string;

  @Column({ name: 'min_booking_days', type: 'int', default: 1 })
  minBookingDays: number;

  @Column({ name: 'max_booking_days', type: 'int', default: 365 })
  maxBookingDays: number;

  // Configurazioni preventivi (per futuro)
  @Column({ name: 'quote_validity_days', type: 'int', default: 7 })
  quoteValidityDays: number;

  @Column({ name: 'deposit_percentage', type: 'decimal', precision: 5, scale: 2, default: 50 })
  depositPercentage: number;

  @Column({ name: 'checkin_payment_percentage', type: 'decimal', precision: 5, scale: 2, default: 30 })
  checkinPaymentPercentage: number;

  @Column({ name: 'checkout_payment_percentage', type: 'decimal', precision: 5, scale: 2, default: 20 })
  checkoutPaymentPercentage: number;

  // Configurazioni pool gabbie
  @Column({ name: 'num_singole', type: 'int', default: 0 })
  numSingole: number;

  @Column({ name: 'num_doppie', type: 'int', default: 0 })
  numDoppie: number;

  @Column({ name: 'cage_occupancy_days', type: 'int', default: 4 })
  cageOccupancyDays: number;

  // Configurazioni appuntamenti
  @Column({ name: 'check_in_max_per_slot', type: 'int', default: 1 })
  checkInMaxPerSlot: number;

  @Column({ name: 'check_out_max_per_slot', type: 'int', default: 1 })
  checkOutMaxPerSlot: number;

  @Column({ name: 'appointment_slot_duration', type: 'int', default: 30 })
  appointmentSlotDuration: number;

  // Configurazioni email appuntamenti
  @Column({ name: 'send_appointment_confirmation', type: 'boolean', default: true })
  sendAppointmentConfirmation: boolean;

  @Column({ name: 'send_appointment_reminder', type: 'boolean', default: true })
  sendAppointmentReminder: boolean;

  @Column({ name: 'appointment_reminder_hours', type: 'int', default: 24 })
  appointmentReminderHours: number;

  // Configurazioni check-in / check-out (Block 10)
  @Column({ name: 'require_checkin_payment_at_checkin', type: 'boolean', default: false })
  requireCheckinPaymentAtCheckin: boolean;

  @Column({ name: 'require_checkout_payment_at_checkout', type: 'boolean', default: false })
  requireCheckoutPaymentAtCheckout: boolean;

  // Configurazioni notifiche (per futuro)
  @Column({ name: 'send_booking_confirmation', type: 'boolean', default: true })
  sendBookingConfirmation: boolean;

  @Column({ name: 'send_check_in_reminder', type: 'boolean', default: true })
  sendCheckInReminder: boolean;

  @Column({ name: 'check_in_reminder_days', type: 'int', default: 3 })
  checkInReminderDays: number;

  // Configurazioni cat taxi
  @Column({ name: 'taxi_base_km', type: 'int', default: 10 })
  taxiBaseKm: number;

  @Column({ name: 'taxi_base_price', type: 'decimal', precision: 10, scale: 2, default: 20.00 })
  taxiBasePrice: number;

  @Column({ name: 'taxi_extra_km_price', type: 'decimal', precision: 10, scale: 2, default: 0.50 })
  taxiExtraKmPrice: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
