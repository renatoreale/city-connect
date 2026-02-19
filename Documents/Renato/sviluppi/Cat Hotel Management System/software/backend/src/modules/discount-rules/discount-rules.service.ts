import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountRule, DiscountType, DiscountAppliesTo } from './entities/discount-rule.entity';
import { CreateDiscountRuleDto, UpdateDiscountRuleDto } from './dto';
import { PriceListCategory } from '../price-list/entities/price-list-item.entity';

@Injectable()
export class DiscountRulesService {
  constructor(
    @InjectRepository(DiscountRule)
    private discountRuleRepository: Repository<DiscountRule>,
  ) {}

  async create(
    createDto: CreateDiscountRuleDto,
    userId: string,
    tenantId?: string,
  ): Promise<DiscountRule> {
    const rule = this.discountRuleRepository.create({
      ...createDto,
      tenantId: tenantId || null,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.discountRuleRepository.save(rule);
  }

  async findAll(options?: {
    tenantId?: string;
    includeGlobal?: boolean;
    isActive?: boolean;
    discountType?: DiscountType;
  }): Promise<DiscountRule[]> {
    const queryBuilder = this.discountRuleRepository
      .createQueryBuilder('rule');

    if (options?.tenantId) {
      if (options.includeGlobal !== false) {
        // Include sia regole tenant che globali
        queryBuilder.andWhere(
          '(rule.tenantId = :tenantId OR rule.tenantId IS NULL)',
          { tenantId: options.tenantId },
        );
      } else {
        // Solo regole tenant
        queryBuilder.andWhere('rule.tenantId = :tenantId', {
          tenantId: options.tenantId,
        });
      }
    } else {
      // Solo regole globali
      queryBuilder.andWhere('rule.tenantId IS NULL');
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('rule.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.discountType) {
      queryBuilder.andWhere('rule.discountType = :discountType', {
        discountType: options.discountType,
      });
    }

    return queryBuilder
      .orderBy('rule.priority', 'DESC')
      .addOrderBy('rule.name', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<DiscountRule> {
    const rule = await this.discountRuleRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!rule) {
      throw new NotFoundException('Regola sconto non trovata');
    }

    return rule;
  }

  async update(
    id: string,
    updateDto: UpdateDiscountRuleDto,
    userId: string,
    tenantId?: string,
  ): Promise<DiscountRule> {
    const rule = await this.findById(id);

    // Verifica permessi: solo chi ha creato la regola può modificarla
    if (rule.tenantId && tenantId && rule.tenantId !== tenantId) {
      throw new ForbiddenException('Non hai i permessi per modificare questa regola');
    }

    Object.assign(rule, updateDto, { updatedBy: userId });
    return this.discountRuleRepository.save(rule);
  }

  async delete(id: string, tenantId?: string): Promise<void> {
    const rule = await this.findById(id);

    // Verifica permessi
    if (rule.tenantId && tenantId && rule.tenantId !== tenantId) {
      throw new ForbiddenException('Non hai i permessi per eliminare questa regola');
    }

    await this.discountRuleRepository.softDelete(rule.id);
  }

  /**
   * Ottiene le regole sconto applicabili per un calcolo prezzo
   */
  async getApplicableRules(
    tenantId: string,
    category: PriceListCategory,
    numberOfNights: number,
    numberOfCats: number,
    date: Date,
  ): Promise<DiscountRule[]> {
    const rules = await this.findAll({
      tenantId,
      includeGlobal: true,
      isActive: true,
    });

    const applicableRules: DiscountRule[] = [];

    for (const rule of rules) {
      // Verifica validità temporale
      if (rule.validFrom && new Date(rule.validFrom) > date) {
        continue;
      }
      if (rule.validTo && new Date(rule.validTo) < date) {
        continue;
      }

      // Verifica categoria - mappa PriceListCategory a DiscountAppliesTo
      if (rule.appliesToCategory !== DiscountAppliesTo.ALL) {
        const categoryMatch =
          (category === PriceListCategory.ACCOMMODATION &&
            rule.appliesToCategory === DiscountAppliesTo.ACCOMMODATION) ||
          (category === PriceListCategory.EXTRA_SERVICE &&
            rule.appliesToCategory === DiscountAppliesTo.EXTRA_SERVICE);
        if (!categoryMatch) {
          continue;
        }
      }

      // Verifica condizioni specifiche per tipo
      switch (rule.discountType) {
        case DiscountType.DURATION:
          if (rule.minNights && numberOfNights >= rule.minNights) {
            applicableRules.push(rule);
          }
          break;

        case DiscountType.MULTI_CAT:
          if (rule.minCats && numberOfCats >= rule.minCats) {
            applicableRules.push(rule);
          }
          break;

        case DiscountType.PERCENTAGE:
        case DiscountType.FIXED:
          // Sconti generici sempre applicabili
          applicableRules.push(rule);
          break;
      }
    }

    // Ordina per priorità (più alta prima)
    return applicableRules.sort((a, b) => b.priority - a.priority);
  }
}
