import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { Cat } from '../../cats/entities/cat.entity';

@Entity('booking_cats')
export class BookingCat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', type: 'varchar', length: 36 })
  bookingId: string;

  @ManyToOne(() => Booking, (booking) => booking.bookingCats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'cat_id', type: 'varchar', length: 36 })
  catId: string;

  @ManyToOne(() => Cat)
  @JoinColumn({ name: 'cat_id' })
  cat: Cat;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
