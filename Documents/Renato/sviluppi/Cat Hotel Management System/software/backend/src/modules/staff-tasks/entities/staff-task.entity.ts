import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { StaffTaskType } from './staff-task-type.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';

export enum StaffTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Compito assegnato allo staff di una pensione.
 * Può essere collegato a una prenotazione specifica oppure essere autonomo (es. pulizie generali).
 */
@Entity('staff_tasks')
@Index(['tenantId', 'dueDate', 'status'])
@Index(['tenantId', 'assignedToUserId', 'dueDate'])
@Index(['tenantId', 'bookingId'])
export class StaffTask extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'task_type_id', type: 'varchar', length: 36 })
  taskTypeId: string;

  @ManyToOne(() => StaffTaskType, { eager: false })
  @JoinColumn({ name: 'task_type_id' })
  taskType: StaffTaskType;

  /**
   * Prenotazione collegata (nullable: un compito può essere autonomo).
   */
  @Column({ name: 'booking_id', type: 'varchar', length: 36, nullable: true })
  bookingId: string | null;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  /**
   * Operatore assegnato (nullable: compito non ancora assegnato).
   */
  @Column({ name: 'assigned_to_user_id', type: 'varchar', length: 36, nullable: true })
  assignedToUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assignedToUser: User | null;

  /**
   * Data di scadenza del compito.
   */
  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  /**
   * Ora di scadenza opzionale (es. "08:00" per la pappa mattino).
   */
  @Column({ name: 'due_time', type: 'time', nullable: true })
  dueTime: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: StaffTaskStatus.PENDING,
  })
  status: StaffTaskStatus;

  /**
   * Timestamp di completamento (popolato quando lo stato diventa COMPLETED).
   */
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'completed_by_user_id', type: 'varchar', length: 36, nullable: true })
  completedByUserId: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'completed_by_user_id' })
  completedByUser: User | null;

  /**
   * Note di completamento / motivazione cancellazione.
   */
  @Column({ name: 'completion_notes', type: 'text', nullable: true })
  completionNotes: string | null;
}
