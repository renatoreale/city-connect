import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PriceListItem, PriceListCategory } from './entities/price-list-item.entity';
import { CreatePriceListItemDto, UpdatePriceListItemDto } from './dto';

@Injectable()
export class PriceListService {
  constructor(
    @InjectRepository(PriceListItem)
    private priceListRepository: Repository<PriceListItem>,
  ) {}

  async create(createDto: CreatePriceListItemDto, userId: string): Promise<PriceListItem> {
    // Verifica unicità codice
    const existing = await this.priceListRepository.findOne({
      where: { code: createDto.code },
    });
    if (existing) {
      throw new ConflictException(`Item con codice "${createDto.code}" già esistente`);
    }

    const item = this.priceListRepository.create({
      ...createDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.priceListRepository.save(item);
  }

  async findAll(options?: {
    category?: PriceListCategory;
    isActive?: boolean;
    skip?: number;
    take?: number;
  }): Promise<{ data: PriceListItem[]; total: number }> {
    const queryBuilder = this.priceListRepository
      .createQueryBuilder('item');

    if (options?.category) {
      queryBuilder.andWhere('item.category = :category', {
        category: options.category,
      });
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('item.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 100)
      .orderBy('item.sortOrder', 'ASC')
      .addOrderBy('item.name', 'ASC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string): Promise<PriceListItem> {
    const item = await this.priceListRepository.findOne({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Item listino non trovato');
    }

    return item;
  }

  async findByCode(code: string): Promise<PriceListItem> {
    const item = await this.priceListRepository.findOne({
      where: { code },
    });

    if (!item) {
      throw new NotFoundException(`Item con codice "${code}" non trovato`);
    }

    return item;
  }

  async update(
    id: string,
    updateDto: UpdatePriceListItemDto,
    userId: string,
  ): Promise<PriceListItem> {
    const item = await this.findById(id);

    // Verifica unicità codice se modificato
    if (updateDto.code && updateDto.code !== item.code) {
      const existing = await this.priceListRepository.findOne({
        where: { code: updateDto.code },
      });
      if (existing) {
        throw new ConflictException(`Item con codice "${updateDto.code}" già esistente`);
      }
    }

    Object.assign(item, updateDto, { updatedBy: userId });
    return this.priceListRepository.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.priceListRepository.softDelete(item.id);
  }

  async findActiveByCategory(category: PriceListCategory): Promise<PriceListItem[]> {
    return this.priceListRepository.find({
      where: { category, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }
}
