import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Quote } from './quote.entity';
import { Cat } from '../../cats/entities/cat.entity';

@Entity('quote_cats')
export class QuoteCat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'quote_id', type: 'varchar', length: 36 })
  quoteId: string;

  @ManyToOne(() => Quote, (quote) => quote.quoteCats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

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
