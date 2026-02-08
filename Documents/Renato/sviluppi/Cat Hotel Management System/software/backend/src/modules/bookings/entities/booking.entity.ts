import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryColumn,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';
import { Quote } from '../../quotes/entities/quote.entity';
import { BookingLineItem } from './booking-line-item.entity';
import { BookingCat } from './booking-cat.entity';
import { BookingStatusHistory } from './booking-status-history.entity';
import { BookingDailyOverride } from './booking-daily-override.entity';

export enum BookingStatus {
  CONFERMATA = 'confermata',
  CHECK_IN = 'check_in',
  IN_CORSO = 'in_corso',
  CHECK_OUT = 'check_out',
  CHIUSA = 'chiusa',
  CANCELLATA = 'cancellata',
  RIMBORSATA = 'rimborsata',
  SCADUTA = 'scaduta',
}

export interface AppliedDiscountSnapshot {
  ruleId: string;
  name: string;
  type: string;
  value: number;
  isPercentage: boolean;
  amount: number;
}

@Entity('bookings')
@Index(['tenantId', 'checkInDate', 'status'])
export class Booking {
  // ID uguale al Quote ID da cui deriva
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'quote_id', type: 'varchar', length: 36 })
  quoteId: string;

  @ManyToOne(() => Quote)
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column({ name: 'client_id', type: 'varchar', length: 36 })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'booking_number', type: 'varchar', length: 20 })
  bookingNumber: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: Date;

  @Column({ name: 'number_of_cats', type: 'int' })
  numberOfCats: number;

  @Column({ name: 'number_of_nights', type: 'int' })
  numberOfNights: number;

  @Column({
    name: 'subtotal_before_discounts',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  subtotalBeforeDiscounts: number;

  @Column({
    name: 'total_discounts',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalDiscounts: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ name: 'applied_discounts', type: 'json', nullable: true })
  appliedDiscounts: AppliedDiscountSnapshot[] | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: BookingStatus.CONFERMATA,
  })
  status: BookingStatus;

  // Importi pagamenti richiesti (calcolati alla conversione)
  @Column({
    name: 'deposit_required',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  depositRequired: number;

  @Column({
    name: 'checkin_payment_required',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  checkinPaymentRequired: number;

  @Column({
    name: 'checkout_payment_required',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  checkoutPaymentRequired: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => BookingLineItem, (lineItem) => lineItem.booking, {
    cascade: true,
  })
  lineItems: BookingLineItem[];

  @OneToMany(() => BookingCat, (bookingCat) => bookingCat.booking, {
    cascade: true,
  })
  bookingCats: BookingCat[];

  @OneToMany(() => BookingStatusHistory, (history) => history.booking)
  statusHistory: BookingStatusHistory[];

  @OneToMany(() => BookingDailyOverride, (override) => override.booking)
  dailyOverrides: BookingDailyOverride[];

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true })
  createdBy: string | null;

  @Column({ name: 'updated_by', type: 'varchar', length: 36, nullable: true })
  updatedBy: string | null;
}
