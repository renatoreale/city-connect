import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Booking, BookingStatus } from './booking.entity';
import { User } from '../../users/entities/user.entity';

@Entity('booking_status_history')
export class BookingStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (booking) => booking.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({
    name: 'from_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  fromStatus: BookingStatus | null;

  @Column({
    name: 'to_status',
    type: 'varchar',
    length: 20,
  })
  toStatus: BookingStatus;

  @Column({ name: 'changed_by', type: 'varchar', length: 36 })
  changedBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
