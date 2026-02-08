import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from '../../users/entities/user.entity';

@Entity('booking_daily_overrides')
@Unique(['bookingId', 'overrideDate'])
@Index(['tenantId', 'overrideDate'])
export class BookingDailyOverride {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (booking) => booking.dailyOverrides, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'override_date', type: 'date' })
  overrideDate: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ name: 'created_by', type: 'varchar', length: 36 })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdByUser: User;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
