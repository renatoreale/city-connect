import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

export enum DiscountType {
  DURATION = 'duration',
  MULTI_CAT = 'multi_cat',
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum DiscountAppliesTo {
  ACCOMMODATION = 'accommodation',
  EXTRA_SERVICE = 'extra_service',
  ALL = 'all',
}

@Entity('discount_rules')
export class DiscountRule extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId: string | null;

  @ManyToOne(() => Tenant, { nullable: true })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant | null;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: DiscountType,
  })
  discountType: DiscountType;

  @Column({ name: 'min_nights', type: 'int', nullable: true })
  minNights: number | null;

  @Column({ name: 'min_cats', type: 'int', nullable: true })
  minCats: number | null;

  @Column({
    name: 'discount_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  discountValue: number;

  @Column({ name: 'is_percentage', type: 'boolean', default: true })
  isPercentage: boolean;

  @Column({
    name: 'applies_to_category',
    type: 'enum',
    enum: DiscountAppliesTo,
    default: DiscountAppliesTo.ALL,
  })
  appliesToCategory: DiscountAppliesTo;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ name: 'is_cumulative', type: 'boolean', default: false })
  isCumulative: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom: Date | null;

  @Column({ name: 'valid_to', type: 'date', nullable: true })
  validTo: Date | null;
}
