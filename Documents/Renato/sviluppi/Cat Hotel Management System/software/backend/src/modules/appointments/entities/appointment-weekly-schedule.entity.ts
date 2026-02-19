import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Unique,
  Index,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum DayOfWeek {
  LUNEDI = 0,
  MARTEDI = 1,
  MERCOLEDI = 2,
  GIOVEDI = 3,
  VENERDI = 4,
  SABATO = 5,
  DOMENICA = 6,
}

export enum ScheduleType {
  CHECK_IN = 'check_in',
  CHECK_OUT = 'check_out',
}

@Entity('appointment_weekly_schedules')
@Unique(['tenantId', 'dayOfWeek', 'scheduleType'])
@Index(['tenantId'])
export class AppointmentWeeklySchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'day_of_week', type: 'int' })
  dayOfWeek: DayOfWeek;

  @Column({
    name: 'schedule_type',
    type: 'varchar',
    length: 20,
  })
  scheduleType: ScheduleType;

  @Column({ name: 'start_time', type: 'time' })
  startTime: string;

  @Column({ name: 'end_time', type: 'time' })
  endTime: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
