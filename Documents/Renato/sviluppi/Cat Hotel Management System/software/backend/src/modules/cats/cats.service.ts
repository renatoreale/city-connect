import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cat } from './entities/cat.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { CreateCatDto, UpdateCatDto, BlacklistCatDto } from './dto';

export interface HealthStatus {
  vaccinationExpired: boolean;
  vaccinationExpiryDate: Date | null;
  fivFelvExpired: boolean;
  fivFelvExpiryDate: Date | null;
}

@Injectable()
export class CatsService {
  constructor(
    @InjectRepository(Cat)
    private catsRepository: Repository<Cat>,
    @InjectRepository(TenantSettings)
    private tenantSettingsRepository: Repository<TenantSettings>,
  ) {}

  async create(createCatDto: CreateCatDto, userId: string): Promise<Cat> {
    const cat = this.catsRepository.create({
      ...createCatDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.catsRepository.save(cat);
  }

  async findAll(
    tenantId: string,
    options?: {
      clientId?: string;
      search?: string;
      isActive?: boolean;
      isBlacklisted?: boolean;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: Cat[]; total: number }> {
    const queryBuilder = this.catsRepository
      .createQueryBuilder('cat')
      .leftJoinAndSelect('cat.client', 'client')
      .leftJoinAndSelect('cat.blacklistedByTenant', 'blacklistedByTenant')
      .where('cat.tenantId = :tenantId', { tenantId });

    if (options?.clientId) {
      queryBuilder.andWhere('cat.clientId = :clientId', {
        clientId: options.clientId,
      });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(cat.name LIKE :search OR cat.microchipNumber LIKE :search OR cat.breed LIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('cat.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.isBlacklisted !== undefined) {
      queryBuilder.andWhere('cat.isBlacklisted = :isBlacklisted', {
        isBlacklisted: options.isBlacklisted,
      });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('cat.name', 'ASC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Cat> {
    const cat = await this.catsRepository.findOne({
      where: { id, tenantId },
      relations: ['client', 'blacklistedByTenant'],
    });

    if (!cat) {
      throw new NotFoundException('Gatto non trovato');
    }

    return cat;
  }

  async findByClientId(clientId: string, tenantId: string): Promise<Cat[]> {
    return this.catsRepository.find({
      where: { clientId, tenantId },
      relations: ['blacklistedByTenant'],
      order: { name: 'ASC' },
    });
  }

  async update(
    id: string,
    tenantId: string,
    updateCatDto: UpdateCatDto,
    userId: string,
  ): Promise<Cat> {
    const cat = await this.findById(id, tenantId);

    Object.assign(cat, updateCatDto, { updatedBy: userId });
    return this.catsRepository.save(cat);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const cat = await this.findById(id, tenantId);
    await this.catsRepository.softDelete(cat.id);
  }

  async addToBlacklist(
    id: string,
    tenantId: string,
    blacklistDto: BlacklistCatDto,
    userId: string,
  ): Promise<Cat> {
    const cat = await this.findById(id, tenantId);

    if (cat.isBlacklisted) {
      throw new ConflictException('Gatto già in blacklist');
    }

    cat.isBlacklisted = true;
    cat.blacklistReason = blacklistDto.reason;
    cat.blacklistedAt = new Date();
    cat.blacklistedByTenantId = tenantId;
    cat.blacklistedByUserId = userId;
    cat.updatedBy = userId;

    return this.catsRepository.save(cat);
  }

  async removeFromBlacklist(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<Cat> {
    const cat = await this.findById(id, tenantId);

    if (!cat.isBlacklisted) {
      throw new ConflictException('Gatto non in blacklist');
    }

    if (cat.blacklistedByTenantId !== tenantId) {
      throw new ForbiddenException(
        'Solo l\'hotel che ha inserito la blacklist può rimuoverla',
      );
    }

    cat.isBlacklisted = false;
    cat.blacklistReason = null;
    cat.blacklistedAt = null;
    cat.blacklistedByTenantId = null;
    cat.blacklistedByUserId = null;
    cat.updatedBy = userId;

    return this.catsRepository.save(cat);
  }

  async getHealthStatus(id: string, tenantId: string): Promise<HealthStatus> {
    const cat = await this.findById(id, tenantId);
    const settings = await this.getTenantSettings(tenantId);

    const now = new Date();
    let vaccinationExpiryDate: Date | null = null;
    let fivFelvExpiryDate: Date | null = null;

    if (cat.vaccinationDate) {
      vaccinationExpiryDate = new Date(cat.vaccinationDate);
      vaccinationExpiryDate.setMonth(
        vaccinationExpiryDate.getMonth() + settings.vaccinationValidityMonths,
      );
    }

    if (cat.fivFelvTestDate) {
      fivFelvExpiryDate = new Date(cat.fivFelvTestDate);
      fivFelvExpiryDate.setMonth(
        fivFelvExpiryDate.getMonth() + settings.fivFelvValidityMonths,
      );
    }

    return {
      vaccinationExpired: vaccinationExpiryDate ? now > vaccinationExpiryDate : true,
      vaccinationExpiryDate,
      fivFelvExpired: fivFelvExpiryDate ? now > fivFelvExpiryDate : true,
      fivFelvExpiryDate,
    };
  }

  async checkBlacklistStatus(microchipNumber: string): Promise<{
    isBlacklisted: boolean;
    details?: {
      catId: string;
      catName: string;
      reason: string | null;
      blacklistedAt: Date | null;
      blacklistedByTenantName: string;
    };
  }> {
    const cat = await this.catsRepository.findOne({
      where: { microchipNumber, isBlacklisted: true },
      relations: ['blacklistedByTenant'],
    });

    if (!cat) {
      return { isBlacklisted: false };
    }

    return {
      isBlacklisted: true,
      details: {
        catId: cat.id,
        catName: cat.name,
        reason: cat.blacklistReason,
        blacklistedAt: cat.blacklistedAt,
        blacklistedByTenantName: cat.blacklistedByTenant?.name || 'Sconosciuto',
      },
    };
  }

  private async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    let settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    if (!settings) {
      // Crea settings di default
      settings = this.tenantSettingsRepository.create({
        tenantId,
        fivFelvValidityMonths: 12,
        vaccinationValidityMonths: 36,
      });
      await this.tenantSettingsRepository.save(settings);
    }

    return settings;
  }

  async getCatsWithHealthAlerts(
    tenantId: string,
    options?: { clientId?: string },
  ): Promise<Array<Cat & { healthStatus: HealthStatus }>> {
    const cats = options?.clientId
      ? await this.findByClientId(options.clientId, tenantId)
      : (await this.findAll(tenantId, { isActive: true })).data;

    const settings = await this.getTenantSettings(tenantId);
    const now = new Date();

    return cats.map((cat) => {
      let vaccinationExpiryDate: Date | null = null;
      let fivFelvExpiryDate: Date | null = null;

      if (cat.vaccinationDate) {
        vaccinationExpiryDate = new Date(cat.vaccinationDate);
        vaccinationExpiryDate.setMonth(
          vaccinationExpiryDate.getMonth() + settings.vaccinationValidityMonths,
        );
      }

      if (cat.fivFelvTestDate) {
        fivFelvExpiryDate = new Date(cat.fivFelvTestDate);
        fivFelvExpiryDate.setMonth(
          fivFelvExpiryDate.getMonth() + settings.fivFelvValidityMonths,
        );
      }

      return {
        ...cat,
        healthStatus: {
          vaccinationExpired: vaccinationExpiryDate ? now > vaccinationExpiryDate : true,
          vaccinationExpiryDate,
          fivFelvExpired: fivFelvExpiryDate ? now > fivFelvExpiryDate : true,
          fivFelvExpiryDate,
        },
      };
    });
  }
}
