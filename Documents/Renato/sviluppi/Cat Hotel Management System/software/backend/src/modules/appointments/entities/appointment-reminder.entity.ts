import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Appointment } from './appointment.entity';
import { EmailLog } from '../../email/entities/email-log.entity';

export enum ReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

@Entity('appointment_reminders')
@Index(['tenantId', 'status', 'scheduledFor'])
@Index(['appointmentId'])
export class AppointmentReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'appointment_id', type: 'varchar', length: 36 })
  appointmentId: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointment_id' })
  appointment: Appointment;

  @Column({ name: 'scheduled_for', type: 'datetime' })
  scheduledFor: Date;

  @Column({
    type: 'varchar',
    length: 20,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ name: 'email_log_id', type: 'varchar', length: 36, nullable: true })
  emailLogId: string | null;

  @ManyToOne(() => EmailLog, { nullable: true })
  @JoinColumn({ name: 'email_log_id' })
  emailLog: EmailLog | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'attempts', type: 'int', default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
