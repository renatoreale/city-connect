import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeasonalPeriod } from './entities/seasonal-period.entity';
import { CreateSeasonalPeriodDto, UpdateSeasonalPeriodDto } from './dto';

@Injectable()
export class SeasonalPeriodsService {
  constructor(
    @InjectRepository(SeasonalPeriod)
    private seasonalPeriodRepository: Repository<SeasonalPeriod>,
  ) {}

  async create(createDto: CreateSeasonalPeriodDto, userId: string): Promise<SeasonalPeriod> {
    const period = this.seasonalPeriodRepository.create({
      ...createDto,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.seasonalPeriodRepository.save(period);
  }

  async findAll(options?: {
    isActive?: boolean;
    year?: number;
  }): Promise<SeasonalPeriod[]> {
    const queryBuilder = this.seasonalPeriodRepository
      .createQueryBuilder('period');

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('period.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.year) {
      queryBuilder.andWhere('(period.year = :year OR period.year IS NULL)', {
        year: options.year,
      });
    }

    return queryBuilder
      .orderBy('period.startMonth', 'ASC')
      .addOrderBy('period.startDay', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<SeasonalPeriod> {
    const period = await this.seasonalPeriodRepository.findOne({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Periodo stagionale non trovato');
    }

    return period;
  }

  async update(
    id: string,
    updateDto: UpdateSeasonalPeriodDto,
    userId: string,
  ): Promise<SeasonalPeriod> {
    const period = await this.findById(id);

    Object.assign(period, updateDto, { updatedBy: userId });
    return this.seasonalPeriodRepository.save(period);
  }

  async delete(id: string): Promise<void> {
    const period = await this.findById(id);
    await this.seasonalPeriodRepository.softDelete(period.id);
  }

  /**
   * Determina se una data cade in alta stagione
   */
  async isHighSeason(date: Date): Promise<boolean> {
    const month = date.getMonth() + 1; // JavaScript months are 0-indexed
    const day = date.getDate();
    const year = date.getFullYear();

    // Cerca periodi attivi per quest'anno o ricorrenti (year IS NULL)
    const periods = await this.seasonalPeriodRepository.find({
      where: { isActive: true, isHighSeason: true },
    });

    for (const period of periods) {
      // Se il periodo ha un anno specifico, deve corrispondere
      if (period.year !== null && period.year !== year) {
        continue;
      }

      if (this.isDateInPeriod(month, day, period)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Ottieni il tipo di stagione per una data
   */
  async getSeasonType(date: Date): Promise<'high' | 'low'> {
    const isHigh = await this.isHighSeason(date);
    return isHigh ? 'high' : 'low';
  }

  private isDateInPeriod(month: number, day: number, period: SeasonalPeriod): boolean {
    const startMonth = period.startMonth;
    const startDay = period.startDay;
    const endMonth = period.endMonth;
    const endDay = period.endDay;

    // Caso semplice: stesso anno (es. 1 Giugno - 31 Agosto)
    if (startMonth < endMonth || (startMonth === endMonth && startDay <= endDay)) {
      if (month > startMonth && month < endMonth) {
        return true;
      }
      if (month === startMonth && day >= startDay) {
        return true;
      }
      if (month === endMonth && day <= endDay) {
        return true;
      }
      return false;
    }

    // Caso a cavallo d'anno (es. 15 Dicembre - 15 Gennaio)
    if (month > startMonth || (month === startMonth && day >= startDay)) {
      return true;
    }
    if (month < endMonth || (month === endMonth && day <= endDay)) {
      return true;
    }

    return false;
  }
}
