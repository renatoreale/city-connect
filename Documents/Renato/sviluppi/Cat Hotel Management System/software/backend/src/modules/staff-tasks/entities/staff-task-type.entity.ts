import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Tenant } from '../../tenants/entities/tenant.entity';

/**
 * Tipo di compito configurabile per ogni singola pensione.
 * Ogni pensione definisce i propri tipi (pulizia, pappa, farmaci, foto, ecc.).
 */
@Entity('staff_task_types')
@Index(['tenantId', 'isActive'])
export class StaffTaskType extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 36 })
  tenantId: string;

  @ManyToOne(() => Tenant)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenant;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * Colore esadecimale (es. "#FF5733") usato nel calendario operativo.
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  /**
   * Descrizione opzionale del tipo di compito.
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Se false, il tipo non è più utilizzabile per nuovi compiti (soft-disable).
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
