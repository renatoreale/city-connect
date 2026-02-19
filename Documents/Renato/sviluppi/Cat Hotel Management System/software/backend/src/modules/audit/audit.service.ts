import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AuditLog, AuditOperation } from './entities/audit-log.entity';

export interface AuditQueryOptions {
  entityType?: string;
  entityId?: string;
  operation?: AuditOperation;
  tenantId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  skip?: number;
  take?: number;
}

/** Campi di sistema che non vengono mai ripristinati. */
const NON_RESTORABLE_FIELDS = new Set([
  'id',
  'tenantId',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'createdBy',
  'password',
]);

/** Campi da ignorare nel calcolo del diff (metadati tecnici). */
const DIFF_SKIP_FIELDS = new Set(['updatedAt', 'updated_at']);

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    private dataSource: DataSource,
  ) {}

  // ─── Query e storia ───────────────────────────────────────────────

  async query(options: AuditQueryOptions): Promise<{ data: AuditLog[]; total: number }> {
    const qb = this.auditLogRepository.createQueryBuilder('audit');

    if (options.entityType) {
      qb.andWhere('audit.entity_type = :entityType', { entityType: options.entityType });
    }
    if (options.entityId) {
      qb.andWhere('audit.entity_id = :entityId', { entityId: options.entityId });
    }
    if (options.operation) {
      qb.andWhere('audit.operation = :operation', { operation: options.operation });
    }
    if (options.tenantId) {
      qb.andWhere('audit.tenant_id = :tenantId', { tenantId: options.tenantId });
    }
    if (options.userId) {
      qb.andWhere('audit.user_id = :userId', { userId: options.userId });
    }
    if (options.startDate && options.endDate) {
      qb.andWhere('audit.created_at BETWEEN :startDate AND :endDate', {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    } else if (options.startDate) {
      qb.andWhere('audit.created_at >= :startDate', { startDate: options.startDate });
    } else if (options.endDate) {
      qb.andWhere('audit.created_at <= :endDate', { endDate: options.endDate });
    }

    const [data, total] = await qb
      .skip(options.skip || 0)
      .take(options.take || 50)
      .orderBy('audit.created_at', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }

  async getRecentLogs(tenantId?: string, limit = 100): Promise<AuditLog[]> {
    const qb = this.auditLogRepository.createQueryBuilder('audit');
    if (tenantId) {
      qb.where('audit.tenant_id = :tenantId', { tenantId });
    }
    return qb.orderBy('audit.created_at', 'DESC').take(limit).getMany();
  }

  async getUserActivity(userId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const qb = this.auditLogRepository
      .createQueryBuilder('audit')
      .where('audit.user_id = :userId', { userId });

    if (startDate && endDate) {
      qb.andWhere('audit.created_at BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    return qb.orderBy('audit.created_at', 'DESC').take(500).getMany();
  }

  // ─── Block 12: Confronto versioni ────────────────────────────────

  /**
   * Recupera un singolo log per ID con verifica tenant opzionale.
   */
  async getLogById(logId: string, tenantId?: string): Promise<AuditLog> {
    const entry = await this.auditLogRepository.findOne({ where: { id: logId } });
    if (!entry) throw new NotFoundException('Voce di audit non trovata');

    if (tenantId && entry.tenantId && entry.tenantId !== tenantId) {
      throw new ForbiddenException('Non hai accesso a questa voce di audit');
    }

    return entry;
  }

  /**
   * Calcola il diff strutturato di una singola voce di audit
   * (stato beforeData → afterData).
   * Utile per vedere cosa è cambiato in un singolo UPDATE.
   */
  async getDiff(logId: string, tenantId?: string): Promise<{
    logId: string;
    entityType: string;
    entityId: string;
    operation: AuditOperation;
    timestamp: Date;
    userId: string;
    userRole: string;
    changedFieldCount: number;
    diff: Record<string, { before: any; after: any }>;
    canRestore: boolean;
  }> {
    const entry = await this.getLogById(logId, tenantId);

    const before = entry.beforeData ?? {};
    const after = entry.afterData ?? {};
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const diff: Record<string, { before: any; after: any }> = {};

    for (const key of allKeys) {
      if (DIFF_SKIP_FIELDS.has(key)) continue;
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        diff[key] = {
          before: before[key] ?? null,
          after: after[key] ?? null,
        };
      }
    }

    const canRestore =
      entry.operation === AuditOperation.UPDATE &&
      !!entry.beforeData &&
      !!(entry.changedFields?.length);

    return {
      logId: entry.id,
      entityType: entry.entityType,
      entityId: entry.entityId,
      operation: entry.operation,
      timestamp: entry.createdAt,
      userId: entry.userId,
      userRole: entry.userRole,
      changedFieldCount: Object.keys(diff).length,
      diff,
      canRestore,
    };
  }

  /**
   * Confronta due voci di audit arbitrarie per la stessa entità.
   * Mostra la differenza tra lo stato "from" e lo stato "to".
   */
  async compareVersions(
    fromLogId: string,
    toLogId: string,
    tenantId?: string,
  ): Promise<{
    entityType: string;
    entityId: string;
    from: { logId: string; timestamp: Date; operation: AuditOperation; userId: string };
    to: { logId: string; timestamp: Date; operation: AuditOperation; userId: string };
    changedFieldCount: number;
    diff: Record<string, { from: any; to: any }>;
  }> {
    const [fromEntry, toEntry] = await Promise.all([
      this.getLogById(fromLogId, tenantId),
      this.getLogById(toLogId, tenantId),
    ]);

    if (fromEntry.entityType !== toEntry.entityType || fromEntry.entityId !== toEntry.entityId) {
      throw new BadRequestException(
        'Le due voci di audit devono appartenere alla stessa entità (stesso tipo e stesso ID).',
      );
    }

    // Lo stato dell'entità al momento "from" = afterData (se UPDATE) o beforeData (se DELETE)
    const stateFrom = fromEntry.afterData ?? fromEntry.beforeData ?? {};
    // Lo stato dell'entità al momento "to"
    const stateTo = toEntry.afterData ?? toEntry.beforeData ?? {};

    const allKeys = new Set([...Object.keys(stateFrom), ...Object.keys(stateTo)]);
    const diff: Record<string, { from: any; to: any }> = {};

    for (const key of allKeys) {
      if (DIFF_SKIP_FIELDS.has(key)) continue;
      if (JSON.stringify(stateFrom[key]) !== JSON.stringify(stateTo[key])) {
        diff[key] = {
          from: stateFrom[key] ?? null,
          to: stateTo[key] ?? null,
        };
      }
    }

    return {
      entityType: fromEntry.entityType,
      entityId: fromEntry.entityId,
      from: {
        logId: fromEntry.id,
        timestamp: fromEntry.createdAt,
        operation: fromEntry.operation,
        userId: fromEntry.userId,
      },
      to: {
        logId: toEntry.id,
        timestamp: toEntry.createdAt,
        operation: toEntry.operation,
        userId: toEntry.userId,
      },
      changedFieldCount: Object.keys(diff).length,
      diff,
    };
  }

  // ─── Block 12: Ripristino versione precedente ─────────────────────

  /**
   * Ripristina un'entità allo stato precedente a una specifica modifica.
   * Supportato solo per voci di tipo UPDATE con beforeData disponibile.
   * Vengono ripristinati solo i campi effettivamente cambiati in quella modifica
   * (usando changedFields), escludendo i campi di sistema.
   *
   * Solo Admin e Titolare possono eseguire il ripristino.
   */
  async restoreVersion(
    logId: string,
    tenantId: string,
    userId: string,
  ): Promise<{
    entityType: string;
    entityId: string;
    restoredFields: string[];
    restoredFrom: Date;
    message: string;
  }> {
    const entry = await this.getLogById(logId, tenantId);

    // Solo UPDATE ha uno stato precedente da ripristinare
    if (entry.operation !== AuditOperation.UPDATE) {
      throw new BadRequestException(
        `Il ripristino è supportato solo per operazioni di tipo UPDATE. ` +
        `Questa voce è di tipo "${entry.operation}".`,
      );
    }

    if (!entry.beforeData) {
      throw new BadRequestException(
        'Questa voce di audit non contiene dati precedenti (beforeData assente).',
      );
    }

    const changedFields = entry.changedFields ?? Object.keys(entry.beforeData);
    if (changedFields.length === 0) {
      throw new BadRequestException(
        'Nessun campo modificato trovato in questa voce di audit.',
      );
    }

    // Risolve l'entità TypeORM per nome
    const metadata = this.dataSource.entityMetadatas.find(
      (m) => m.name === entry.entityType,
    );
    if (!metadata) {
      throw new BadRequestException(
        `Il tipo di entità "${entry.entityType}" non è registrato o non supporta il ripristino.`,
      );
    }

    const repo = this.dataSource.getRepository(metadata.target);

    // Cerca l'entità anche se soft-deleted (withDeleted per le entità con DeleteDateColumn)
    const current = await repo.findOne({
      where: { id: entry.entityId } as any,
      withDeleted: true,
    });
    if (!current) {
      throw new NotFoundException(
        `Entità ${entry.entityType} con ID ${entry.entityId} non trovata nel database.`,
      );
    }

    // Applica solo i campi modificati (changedFields) dal beforeData,
    // saltando i campi di sistema non ripristinabili
    const restoredFields: string[] = [];
    for (const field of changedFields) {
      if (NON_RESTORABLE_FIELDS.has(field)) continue;
      if (field in entry.beforeData) {
        (current as any)[field] = entry.beforeData[field];
        restoredFields.push(field);
      }
    }

    if (restoredFields.length === 0) {
      throw new BadRequestException(
        'Tutti i campi modificati sono campi di sistema non ripristinabili.',
      );
    }

    // Aggiorna updatedBy per tracciabilità
    if ('updatedBy' in current) {
      (current as any).updatedBy = userId;
    }

    // Rimuove eventuale soft-delete se l'entità era stata cancellata
    if ('deletedAt' in current && (current as any).deletedAt !== null) {
      (current as any).deletedAt = null;
    }

    await repo.save(current);

    return {
      entityType: entry.entityType,
      entityId: entry.entityId,
      restoredFields,
      restoredFrom: entry.createdAt,
      message:
        `Ripristino completato: ${restoredFields.length} campo/i ` +
        `(${restoredFields.join(', ')}) riportati allo stato del ${entry.createdAt.toISOString()}.`,
    };
  }
}
