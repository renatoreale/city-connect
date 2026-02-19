import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';

export enum PaymentType {
  CAPARRA = 'caparra',
  ACCONTO_CHECKIN = 'acconto_checkin',
  SALDO_CHECKOUT = 'saldo_checkout',
  EXTRA = 'extra',
  RIMBORSO = 'rimborso',
}

export enum PaymentMethod {
  CONTANTI = 'contanti',
  CARTA = 'carta',
  BONIFICO = 'bonifico',
  ALTRO = 'altro',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'booking_id', type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({
    name: 'payment_type',
    type: 'varchar',
    length: 20,
  })
  paymentType: PaymentType;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  amount: number;

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 20,
  })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'varchar', length: 36 })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
