import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  SoftRemoveEvent,
  RecoverEvent,
  DataSource,
} from 'typeorm';
import { AuditLog, AuditOperation } from '../entities/audit-log.entity';

interface AuditableEntity {
  id: string;
  tenantId?: string;
}

const EXCLUDED_ENTITIES = ['AuditLog', 'RefreshToken'];

@EventSubscriber()
export class AuditSubscriber implements EntitySubscriberInterface {
  private static auditContext: {
    userId?: string;
    userRole?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
  } = {};

  constructor(private dataSource: DataSource) {
    dataSource.subscribers.push(this);
  }

  static setAuditContext(context: {
    userId?: string;
    userRole?: string;
    tenantId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): void {
    AuditSubscriber.auditContext = context;
  }

  static clearAuditContext(): void {
    AuditSubscriber.auditContext = {};
  }

  private shouldAudit(entityName: string): boolean {
    return !EXCLUDED_ENTITIES.includes(entityName);
  }

  private getEntityName(event: any): string {
    return event.metadata.name;
  }

  private async createAuditLog(
    operation: AuditOperation,
    entityType: string,
    entityId: string,
    beforeData: Record<string, any> | null,
    afterData: Record<string, any> | null,
    manager: any,
    entityTenantId?: string,
  ): Promise<void> {
    const changedFields = this.getChangedFields(beforeData, afterData);

    const auditLog = new AuditLog();
    auditLog.entityType = entityType;
    auditLog.entityId = entityId;
    auditLog.operation = operation;
    auditLog.tenantId = entityTenantId || AuditSubscriber.auditContext.tenantId;
    auditLog.userId = AuditSubscriber.auditContext.userId || 'system';
    auditLog.userRole = AuditSubscriber.auditContext.userRole || 'system';
    auditLog.beforeData = beforeData;
    auditLog.afterData = afterData;
    auditLog.changedFields = changedFields;
    auditLog.ipAddress = AuditSubscriber.auditContext.ipAddress;
    auditLog.userAgent = AuditSubscriber.auditContext.userAgent;

    await manager.getRepository(AuditLog).insert(auditLog);
  }

  private getChangedFields(
    before: Record<string, any> | null,
    after: Record<string, any> | null,
  ): string[] {
    if (!before || !after) return [];

    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (key === 'updatedAt' || key === 'updated_at') continue;
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'refreshToken'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  async afterInsert(event: InsertEvent<AuditableEntity>): Promise<void> {
    const entityName = this.getEntityName(event);
    if (!this.shouldAudit(entityName) || !event.entity) return;

    const afterData = this.sanitizeData(event.entity as Record<string, any>);

    await this.createAuditLog(
      AuditOperation.INSERT,
      entityName,
      event.entity.id,
      null,
      afterData,
      event.manager,
      event.entity.tenantId,
    );
  }

  async afterUpdate(event: UpdateEvent<AuditableEntity>): Promise<void> {
    const entityName = this.getEntityName(event);
    if (!this.shouldAudit(entityName)) return;

    const entityId =
      (event.entity as AuditableEntity)?.id ||
      (event.databaseEntity as AuditableEntity)?.id ||
      '';

    if (!entityId) return;

    const beforeData = event.databaseEntity
      ? this.sanitizeData(event.databaseEntity as Record<string, any>)
      : null;
    const afterData = event.entity
      ? this.sanitizeData(event.entity as Record<string, any>)
      : null;

    const tenantId =
      (event.entity as AuditableEntity)?.tenantId ||
      (event.databaseEntity as AuditableEntity)?.tenantId;

    await this.createAuditLog(
      AuditOperation.UPDATE,
      entityName,
      entityId,
      beforeData,
      afterData,
      event.manager,
      tenantId,
    );
  }

  async afterRemove(event: RemoveEvent<AuditableEntity>): Promise<void> {
    const entityName = this.getEntityName(event);
    if (!this.shouldAudit(entityName) || !event.entity) return;

    const beforeData = this.sanitizeData(event.entity as Record<string, any>);

    await this.createAuditLog(
      AuditOperation.DELETE,
      entityName,
      event.entity.id,
      beforeData,
      null,
      event.manager,
      event.entity.tenantId,
    );
  }

  async afterSoftRemove(event: SoftRemoveEvent<AuditableEntity>): Promise<void> {
    const entityName = this.getEntityName(event);
    if (!this.shouldAudit(entityName) || !event.entity) return;

    const beforeData = event.databaseEntity
      ? this.sanitizeData(event.databaseEntity as Record<string, any>)
      : null;
    const afterData = this.sanitizeData(event.entity as Record<string, any>);

    await this.createAuditLog(
      AuditOperation.DELETE,
      entityName,
      event.entity.id,
      beforeData,
      afterData,
      event.manager,
      event.entity.tenantId,
    );
  }

  async afterRecover(event: RecoverEvent<AuditableEntity>): Promise<void> {
    const entityName = this.getEntityName(event);
    if (!this.shouldAudit(entityName) || !event.entity) return;

    const afterData = this.sanitizeData(event.entity as Record<string, any>);

    await this.createAuditLog(
      AuditOperation.RESTORE,
      entityName,
      event.entity.id,
      null,
      afterData,
      event.manager,
      event.entity.tenantId,
    );
  }
}
