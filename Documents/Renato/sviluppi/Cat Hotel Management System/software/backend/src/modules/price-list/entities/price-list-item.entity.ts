import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum PriceListCategory {
  ACCOMMODATION = 'accommodation',
  EXTRA_SERVICE = 'extra_service',
}

export enum PriceListUnitType {
  PER_NIGHT = 'per_night',
  PER_DAY = 'per_day',
  ONE_TIME = 'one_time',
  PER_HOUR = 'per_hour',
}

@Entity('price_list_items')
export class PriceListItem extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: PriceListCategory,
    default: PriceListCategory.ACCOMMODATION,
  })
  category: PriceListCategory;

  @Column({
    name: 'unit_type',
    type: 'enum',
    enum: PriceListUnitType,
    default: PriceListUnitType.PER_NIGHT,
  })
  unitType: PriceListUnitType;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  basePrice: number;

  @Column({
    name: 'high_season_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  highSeasonPrice: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
