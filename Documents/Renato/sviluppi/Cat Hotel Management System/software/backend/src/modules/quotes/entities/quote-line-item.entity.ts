import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Quote } from './quote.entity';
import { PriceListItem, ExtraServicePricingModel } from '../../price-list/entities/price-list-item.entity';

export enum LineItemSeasonType {
  HIGH = 'high',
  LOW = 'low',
}

export enum LineItemCategory {
  ACCOMMODATION = 'accommodation',
  EXTRA_SERVICE = 'extra_service',
}

export enum LineItemUnitType {
  PER_NIGHT = 'per_night',
  PER_DAY = 'per_day',
  ONE_TIME = 'one_time',
  PER_HOUR = 'per_hour',
}

@Entity('quote_line_items')
export class QuoteLineItem extends BaseEntity {
  @Column({ name: 'quote_id', type: 'varchar', length: 36 })
  quoteId: string;

  @ManyToOne(() => Quote, (quote) => quote.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column({ name: 'price_list_item_id', type: 'varchar', length: 36, nullable: true })
  priceListItemId: string | null;

  @ManyToOne(() => PriceListItem, { nullable: true })
  @JoinColumn({ name: 'price_list_item_id' })
  priceListItem: PriceListItem | null;

  @Column({ name: 'item_code', type: 'varchar', length: 50 })
  itemCode: string;

  @Column({ name: 'item_name', type: 'varchar', length: 100 })
  itemName: string;

  @Column({
    type: 'enum',
    enum: LineItemCategory,
  })
  category: LineItemCategory;

  @Column({
    name: 'unit_type',
    type: 'enum',
    enum: LineItemUnitType,
  })
  unitType: LineItemUnitType;

  @Column({
    name: 'pricing_model',
    type: 'enum',
    enum: ExtraServicePricingModel,
    nullable: true,
  })
  pricingModel: ExtraServicePricingModel | null;

  @Column({
    name: 'season_type',
    type: 'enum',
    enum: LineItemSeasonType,
    nullable: true,
  })
  seasonType: LineItemSeasonType | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: Date | null;

  @Column({ name: 'applies_to_cat_count', type: 'int', nullable: true })
  appliesToCatCount: number | null;

  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  unitPrice: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  subtotal: number;

  @Column({
    name: 'discount_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  discountAmount: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  total: number;

  @Column({ name: 'line_order', type: 'int', default: 0 })
  lineOrder: number;

  // Km percorsi (solo per pricingModel = per_km)
  @Column({ type: 'int', nullable: true })
  km: number | null;
}
