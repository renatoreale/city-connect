import {
  Entity,
  Column,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('seasonal_periods')
export class SeasonalPeriod extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ name: 'start_month', type: 'int' })
  startMonth: number;

  @Column({ name: 'start_day', type: 'int' })
  startDay: number;

  @Column({ name: 'end_month', type: 'int' })
  endMonth: number;

  @Column({ name: 'end_day', type: 'int' })
  endDay: number;

  @Column({ name: 'is_high_season', type: 'boolean', default: true })
  isHighSeason: boolean;

  @Column({ type: 'int', nullable: true })
  year: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
