import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { PriceListItem } from '../../price-list/entities/price-list-item.entity';

@Entity('tenant_price_overrides')
@Unique(['tenantId', 'priceListItemId'])
export class TenantPriceOverride extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'price_list_item_id', type: 'varchar', length: 36 })
  priceListItemId: string;

  @ManyToOne(() => PriceListItem)
  @JoinColumn({ name: 'price_list_item_id' })
  priceListItem: PriceListItem;

  @Column({
    name: 'base_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  basePrice: number | null;

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
}
