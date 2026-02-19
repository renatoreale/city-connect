import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './entities/client.entity';
import { CreateClientDto, UpdateClientDto, BlacklistClientDto } from './dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientsRepository: Repository<Client>,
  ) {}

  async create(createClientDto: CreateClientDto, userId: string): Promise<Client> {
    // Verifica unicità codice fiscale per tenant
    if (createClientDto.fiscalCode) {
      const existing = await this.clientsRepository.findOne({
        where: {
          tenantId: createClientDto.tenantId,
          fiscalCode: createClientDto.fiscalCode,
        },
      });
      if (existing) {
        throw new ConflictException('Cliente con questo codice fiscale già esistente');
      }
    }

    const client = this.clientsRepository.create({
      ...createClientDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.clientsRepository.save(client);
  }

  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      isActive?: boolean;
      isBlacklisted?: boolean;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: Client[]; total: number }> {
    const queryBuilder = this.clientsRepository
      .createQueryBuilder('client')
      .where('client.tenantId = :tenantId', { tenantId });

    if (options?.search) {
      queryBuilder.andWhere(
        '(client.firstName LIKE :search OR client.lastName LIKE :search OR client.email LIKE :search OR client.fiscalCode LIKE :search OR client.phone1 LIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('client.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.isBlacklisted !== undefined) {
      queryBuilder.andWhere('client.isBlacklisted = :isBlacklisted', {
        isBlacklisted: options.isBlacklisted,
      });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('client.lastName', 'ASC')
      .addOrderBy('client.firstName', 'ASC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id, tenantId },
      relations: ['blacklistedByTenant'],
    });

    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }

    return client;
  }

  async findByIdGlobal(id: string): Promise<Client> {
    // Per ricerche globali (es. verifica blacklist)
    const client = await this.clientsRepository.findOne({
      where: { id },
      relations: ['tenant', 'blacklistedByTenant'],
    });

    if (!client) {
      throw new NotFoundException('Cliente non trovato');
    }

    return client;
  }

  async update(
    id: string,
    tenantId: string,
    updateClientDto: UpdateClientDto,
    userId: string,
  ): Promise<Client> {
    const client = await this.findById(id, tenantId);

    // Verifica unicità codice fiscale se modificato
    if (updateClientDto.fiscalCode && updateClientDto.fiscalCode !== client.fiscalCode) {
      const existing = await this.clientsRepository.findOne({
        where: {
          tenantId,
          fiscalCode: updateClientDto.fiscalCode,
        },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('Cliente con questo codice fiscale già esistente');
      }
    }

    Object.assign(client, updateClientDto, { updatedBy: userId });
    return this.clientsRepository.save(client);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const client = await this.findById(id, tenantId);
    await this.clientsRepository.softDelete(client.id);
  }

  async addToBlacklist(
    id: string,
    tenantId: string,
    blacklistDto: BlacklistClientDto,
    userId: string,
  ): Promise<Client> {
    const client = await this.findById(id, tenantId);

    if (client.isBlacklisted) {
      throw new ConflictException('Cliente già in blacklist');
    }

    client.isBlacklisted = true;
    client.blacklistReason = blacklistDto.reason;
    client.blacklistedAt = new Date();
    client.blacklistedByTenantId = tenantId;
    client.blacklistedByUserId = userId;
    client.updatedBy = userId;

    return this.clientsRepository.save(client);
  }

  async removeFromBlacklist(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Client> {
    const client = await this.findById(id, tenantId);

    if (!client.isBlacklisted) {
      throw new ConflictException('Cliente non in blacklist');
    }

    // Solo l'hotel che ha messo in blacklist può rimuovere
    if (client.blacklistedByTenantId !== tenantId) {
      throw new ForbiddenException(
        'Solo l\'hotel che ha inserito la blacklist può rimuoverla',
      );
    }

    client.isBlacklisted = false;
    client.blacklistReason = null;
    client.blacklistedAt = null;
    client.blacklistedByTenantId = null;
    client.blacklistedByUserId = null;
    client.updatedBy = userId;

    return this.clientsRepository.save(client);
  }

  async checkBlacklistStatus(fiscalCode: string): Promise<{
    isBlacklisted: boolean;
    details?: {
      clientId: string;
      clientName: string;
      reason: string | null;
      blacklistedAt: Date | null;
      blacklistedByTenantName: string;
    };
  }> {
    const client = await this.clientsRepository.findOne({
      where: { fiscalCode, isBlacklisted: true },
      relations: ['blacklistedByTenant'],
    });

    if (!client) {
      return { isBlacklisted: false };
    }

    return {
      isBlacklisted: true,
      details: {
        clientId: client.id,
        clientName: client.fullName,
        reason: client.blacklistReason,
        blacklistedAt: client.blacklistedAt,
        blacklistedByTenantName: client.blacklistedByTenant?.name || 'Sconosciuto',
      },
    };
  }

  async findByFiscalCode(fiscalCode: string, tenantId: string): Promise<Client | null> {
    return this.clientsRepository.findOne({
      where: { fiscalCode, tenantId },
    });
  }
}
