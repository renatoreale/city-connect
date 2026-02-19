import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { Client } from '../../clients/entities/client.entity';
import { QuoteLineItem } from './quote-line-item.entity';
import { QuoteCat } from './quote-cat.entity';

export enum QuoteStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  CONVERTED = 'converted',
}

export interface AppliedDiscountSnapshot {
  ruleId: string;
  name: string;
  type: string;
  value: number;
  isPercentage: boolean;
  amount: number;
}

@Entity('quotes')
export class Quote extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ name: 'client_id', type: 'varchar', length: 36 })
  clientId: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ name: 'quote_number', type: 'varchar', length: 20 })
  quoteNumber: string;

  @Column({ name: 'check_in_date', type: 'date' })
  checkInDate: Date;

  @Column({ name: 'check_out_date', type: 'date' })
  checkOutDate: Date;

  @Column({ name: 'number_of_cats', type: 'int' })
  numberOfCats: number;

  @Column({
    name: 'subtotal_before_discounts',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  subtotalBeforeDiscounts: number;

  @Column({
    name: 'total_discounts',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalDiscounts: number;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  totalAmount: number;

  @Column({ name: 'applied_discounts', type: 'json', nullable: true })
  appliedDiscounts: AppliedDiscountSnapshot[] | null;

  @Column({
    type: 'enum',
    enum: QuoteStatus,
    default: QuoteStatus.DRAFT,
  })
  status: QuoteStatus;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'pdf_path', type: 'varchar', length: 500, nullable: true })
  pdfPath: string | null;

  @Column({ name: 'pdf_generated_at', type: 'timestamp', nullable: true })
  pdfGeneratedAt: Date | null;

  @OneToMany(() => QuoteLineItem, (lineItem) => lineItem.quote, {
    cascade: true,
  })
  lineItems: QuoteLineItem[];

  @OneToMany(() => QuoteCat, (quoteCat) => quoteCat.quote, {
    cascade: true,
  })
  quoteCats: QuoteCat[];

  get numberOfNights(): number {
    if (!this.checkInDate || !this.checkOutDate) return 0;
    const checkIn = new Date(this.checkInDate);
    const checkOut = new Date(this.checkOutDate);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}
