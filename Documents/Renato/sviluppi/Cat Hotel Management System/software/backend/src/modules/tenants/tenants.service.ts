import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { UserTenant } from '../users/entities/user-tenant.entity';
import { CreateTenantDto, UpdateTenantDto } from './dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant)
    private tenantsRepository: Repository<Tenant>,
    @InjectRepository(UserTenant)
    private userTenantRepository: Repository<UserTenant>,
  ) {}

  async findAll(options?: {
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ data: Tenant[]; total: number }> {
    const queryBuilder = this.tenantsRepository.createQueryBuilder('tenant');

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('tenant.is_active = :isActive', {
        isActive: options.isActive,
      });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('tenant.name', 'ASC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Tenant | null> {
    return this.tenantsRepository.findOne({
      where: { code },
    });
  }

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    const existingTenant = await this.findByCode(createTenantDto.code);
    if (existingTenant) {
      throw new ConflictException('Codice tenant già in uso');
    }

    const tenant = this.tenantsRepository.create(createTenantDto);
    return this.tenantsRepository.save(tenant);
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant non trovato');
    }

    Object.assign(tenant, updateTenantDto);
    return this.tenantsRepository.save(tenant);
  }

  async delete(id: string): Promise<void> {
    const tenant = await this.findById(id);
    if (!tenant) {
      throw new NotFoundException('Tenant non trovato');
    }

    await this.tenantsRepository.softDelete(id);
  }

  async getTenantUsers(tenantId: string): Promise<UserTenant[]> {
    return this.userTenantRepository.find({
      where: { tenantId, isActive: true },
      relations: ['user', 'role'],
    });
  }

  async findByIds(ids: string[]): Promise<Tenant[]> {
    if (!ids || ids.length === 0) return [];

    return this.tenantsRepository
      .createQueryBuilder('tenant')
      .whereInIds(ids)
      .getMany();
  }
}
