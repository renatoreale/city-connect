import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantPriceOverride } from './entities/tenant-price-override.entity';
import { CreateTenantPriceOverrideDto, UpdateTenantPriceOverrideDto } from './dto';

@Injectable()
export class TenantPriceOverridesService {
  constructor(
    @InjectRepository(TenantPriceOverride)
    private overrideRepository: Repository<TenantPriceOverride>,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateTenantPriceOverrideDto,
    userId: string,
  ): Promise<TenantPriceOverride> {
    // Verifica unicità combinazione tenant + item
    const existing = await this.overrideRepository.findOne({
      where: {
        tenantId,
        priceListItemId: createDto.priceListItemId,
      },
    });
    if (existing) {
      throw new ConflictException('Override già esistente per questo item');
    }

    const override = this.overrideRepository.create({
      ...createDto,
      tenantId,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.overrideRepository.save(override);
  }

  async findAll(
    tenantId: string,
    options?: {
      isActive?: boolean;
    },
  ): Promise<TenantPriceOverride[]> {
    const queryBuilder = this.overrideRepository
      .createQueryBuilder('override')
      .leftJoinAndSelect('override.priceListItem', 'priceListItem')
      .where('override.tenantId = :tenantId', { tenantId });

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('override.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    return queryBuilder
      .orderBy('priceListItem.sortOrder', 'ASC')
      .addOrderBy('priceListItem.name', 'ASC')
      .getMany();
  }

  async findById(id: string, tenantId: string): Promise<TenantPriceOverride> {
    const override = await this.overrideRepository.findOne({
      where: { id, tenantId },
      relations: ['priceListItem'],
    });

    if (!override) {
      throw new NotFoundException('Override non trovato');
    }

    return override;
  }

  async findByItemId(
    priceListItemId: string,
    tenantId: string,
  ): Promise<TenantPriceOverride | null> {
    return this.overrideRepository.findOne({
      where: { priceListItemId, tenantId, isActive: true },
      relations: ['priceListItem'],
    });
  }

  async update(
    id: string,
    tenantId: string,
    updateDto: UpdateTenantPriceOverrideDto,
    userId: string,
  ): Promise<TenantPriceOverride> {
    const override = await this.findById(id, tenantId);

    Object.assign(override, updateDto, { updatedBy: userId });
    return this.overrideRepository.save(override);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const override = await this.findById(id, tenantId);
    await this.overrideRepository.softDelete(override.id);
  }

  /**
   * Ottiene tutti gli override attivi per un tenant, indicizzati per itemId
   */
  async getActiveOverridesMap(tenantId: string): Promise<Map<string, TenantPriceOverride>> {
    const overrides = await this.findAll(tenantId, { isActive: true });
    const map = new Map<string, TenantPriceOverride>();

    for (const override of overrides) {
      map.set(override.priceListItemId, override);
    }

    return map;
  }
}
