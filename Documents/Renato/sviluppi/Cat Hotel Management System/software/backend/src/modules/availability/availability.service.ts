import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, In } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { BookingCat } from '../bookings/entities/booking-cat.entity';
import { Cat, CatSize } from '../cats/entities/cat.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { BookingDailyOverride } from '../bookings/entities/booking-daily-override.entity';

export interface CageAssignment {
  singoleNeeded: number;
  doppieNeeded: number;
  details: {
    catId: string;
    catName: string;
    size: CatSize;
    cageType: 'singola' | 'doppia';
    sharedWith?: string; // catId del compagno di gabbia
  }[];
}

export interface DailyBreakdown {
  date: string;
  singoleTotal: number;
  singoleOccupied: number;
  singoleAvailable: number;
  doppieTotal: number;
  doppieOccupied: number;
  doppieAvailable: number;
}

const ACTIVE_STATUSES = [
  BookingStatus.CONFERMATA,
  BookingStatus.CHECK_IN,
  BookingStatus.IN_CORSO,
];

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingCat)
    private bookingCatRepository: Repository<BookingCat>,
    @InjectRepository(Cat)
    private catRepository: Repository<Cat>,
    @InjectRepository(TenantSettings)
    private tenantSettingsRepository: Repository<TenantSettings>,
    @InjectRepository(BookingDailyOverride)
    private dailyOverrideRepository: Repository<BookingDailyOverride>,
  ) {}

  /**
   * Calcola quante gabbie singole/doppie servono per un set di gatti.
   * Regole:
   * 1. Fratelli (stesso clientId + siblingGroupId): GRANDI -> 1 doppia ciascuno; NORMALI -> 2-a-2 in doppie, dispari -> singola
   * 2. Individuali: GRANDI -> 1 doppia; NORMALI -> 1 singola
   */
  computeCageAssignment(cats: Cat[]): CageAssignment {
    let singoleNeeded = 0;
    let doppieNeeded = 0;
    const details: CageAssignment['details'] = [];

    // Raggruppa fratelli: key = clientId + siblingGroupId
    const siblingGroups = new Map<string, Cat[]>();
    const individuals: Cat[] = [];

    for (const cat of cats) {
      if (cat.siblingGroupId) {
        const key = `${cat.clientId}:${cat.siblingGroupId}`;
        if (!siblingGroups.has(key)) {
          siblingGroups.set(key, []);
        }
        siblingGroups.get(key)!.push(cat);
      } else {
        individuals.push(cat);
      }
    }

    // Processa gruppi di fratelli
    for (const [, siblings] of siblingGroups) {
      const grandi = siblings.filter(c => c.size === CatSize.GRANDE);
      const normali = siblings.filter(c => c.size === CatSize.NORMALE);

      // Fratelli GRANDI: ciascuno occupa 1 doppia intera
      for (const cat of grandi) {
        doppieNeeded++;
        details.push({
          catId: cat.id,
          catName: cat.name,
          size: cat.size,
          cageType: 'doppia',
        });
      }

      // Fratelli NORMALI: accoppia 2-a-2 in doppie
      for (let i = 0; i < normali.length; i += 2) {
        if (i + 1 < normali.length) {
          // Coppia in doppia
          doppieNeeded++;
          details.push({
            catId: normali[i].id,
            catName: normali[i].name,
            size: normali[i].size,
            cageType: 'doppia',
            sharedWith: normali[i + 1].id,
          });
          details.push({
            catId: normali[i + 1].id,
            catName: normali[i + 1].name,
            size: normali[i + 1].size,
            cageType: 'doppia',
            sharedWith: normali[i].id,
          });
        } else {
          // Dispari: ultimo va in singola
          singoleNeeded++;
          details.push({
            catId: normali[i].id,
            catName: normali[i].name,
            size: normali[i].size,
            cageType: 'singola',
          });
        }
      }
    }

    // Processa individuali
    for (const cat of individuals) {
      if (cat.size === CatSize.GRANDE) {
        doppieNeeded++;
        details.push({
          catId: cat.id,
          catName: cat.name,
          size: cat.size,
          cageType: 'doppia',
        });
      } else {
        singoleNeeded++;
        details.push({
          catId: cat.id,
          catName: cat.name,
          size: cat.size,
          cageType: 'singola',
        });
      }
    }

    return { singoleNeeded, doppieNeeded, details };
  }

  /**
   * Per una data specifica, calcola le gabbie necessarie da tutte le prenotazioni attive
   * la cui finestra di occupazione include quella data.
   * Condizione: booking.checkInDate >= date - (occupancyDays-1) AND booking.checkInDate <= date
   */
  async getRawNeedsForDate(
    tenantId: string,
    date: Date,
    occupancyDays: number,
    queryRunner?: QueryRunner,
  ): Promise<{ singoleNeeded: number; doppieNeeded: number }> {
    const dateStr = this.formatDate(date);

    // Calcola la finestra: checkInDate tra [date - (occupancyDays-1)] e [date]
    const windowStart = new Date(date);
    windowStart.setDate(windowStart.getDate() - (occupancyDays - 1));
    const windowStartStr = this.formatDate(windowStart);

    const repo = queryRunner ? queryRunner.manager.getRepository(Booking) : this.bookingRepository;

    // Trova prenotazioni attive nella finestra
    const bookings = await repo
      .createQueryBuilder('booking')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('booking.checkInDate >= :windowStart', { windowStart: windowStartStr })
      .andWhere('booking.checkInDate <= :date', { date: dateStr })
      .andWhere('booking.deletedAt IS NULL')
      .getMany();

    if (bookings.length === 0) {
      return { singoleNeeded: 0, doppieNeeded: 0 };
    }

    // Filtra via le prenotazioni con forzatura attiva per questo giorno
    const overrideRepo = queryRunner
      ? queryRunner.manager.getRepository(BookingDailyOverride)
      : this.dailyOverrideRepository;

    const overrides = await overrideRepo.find({
      where: { tenantId, overrideDate: new Date(dateStr) },
      select: ['bookingId'],
    });

    const overriddenBookingIds = new Set(overrides.map(o => o.bookingId));
    const filteredBookings = bookings.filter(b => !overriddenBookingIds.has(b.id));

    if (filteredBookings.length === 0) {
      return { singoleNeeded: 0, doppieNeeded: 0 };
    }

    // Per ogni prenotazione, trova i gatti e calcola le gabbie
    let totalSingole = 0;
    let totalDoppie = 0;

    const bookingCatRepo = queryRunner
      ? queryRunner.manager.getRepository(BookingCat)
      : this.bookingCatRepository;
    const catRepo = queryRunner
      ? queryRunner.manager.getRepository(Cat)
      : this.catRepository;

    for (const booking of filteredBookings) {
      const bookingCats = await bookingCatRepo.find({
        where: { bookingId: booking.id },
      });

      if (bookingCats.length === 0) continue;

      const catIds = bookingCats.map(bc => bc.catId);
      const cats = await catRepo.find({
        where: { id: In(catIds) },
      });

      const assignment = this.computeCageAssignment(cats);
      totalSingole += assignment.singoleNeeded;
      totalDoppie += assignment.doppieNeeded;
    }

    return { singoleNeeded: totalSingole, doppieNeeded: totalDoppie };
  }

  /**
   * API pubblica: disponibilita giornaliera per un intervallo date.
   * Per ogni giorno nella finestra di occupazione, calcola occupazione e disponibilita residua.
   * Gestisce l'overflow: se singole esaurite, le normali vanno in doppie.
   */
  async getDailyAvailability(
    tenantId: string,
    checkInDate: string,
    checkOutDate: string,
  ): Promise<{
    poolConfig: { numSingole: number; numDoppie: number; cageOccupancyDays: number };
    dailyBreakdown: DailyBreakdown[];
  }> {
    const settings = await this.getSettings(tenantId);
    const { numSingole, numDoppie, cageOccupancyDays } = settings;

    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);

    // La finestra di occupazione va da checkInDate a checkInDate + (occupancyDays - 1)
    // Ma per mostrare la disponibilita completa, iteriamo su tutti i giorni rilevanti
    const occupancyEndDate = new Date(startDate);
    occupancyEndDate.setDate(occupancyEndDate.getDate() + (cageOccupancyDays - 1));

    // Usiamo la data piu avanzata tra checkOutDate e occupancyEndDate
    const displayEnd = endDate > occupancyEndDate ? endDate : occupancyEndDate;

    const dailyBreakdown: DailyBreakdown[] = [];
    const current = new Date(startDate);

    while (current <= displayEnd) {
      const needs = await this.getRawNeedsForDate(tenantId, current, cageOccupancyDays);

      // Gestisci overflow: se singole necessarie > disponibili, eccesso va in doppie
      let singoleOccupied = needs.singoleNeeded;
      let doppieOccupied = needs.doppieNeeded;

      if (singoleOccupied > numSingole) {
        const overflow = singoleOccupied - numSingole;
        singoleOccupied = numSingole;
        doppieOccupied += overflow; // 1 gatto normale in doppia = occupa tutta la doppia
      }

      dailyBreakdown.push({
        date: this.formatDate(current),
        singoleTotal: numSingole,
        singoleOccupied,
        singoleAvailable: Math.max(0, numSingole - singoleOccupied),
        doppieTotal: numDoppie,
        doppieOccupied,
        doppieAvailable: Math.max(0, numDoppie - doppieOccupied),
      });

      current.setDate(current.getDate() + 1);
    }

    return {
      poolConfig: { numSingole, numDoppie, cageOccupancyDays },
      dailyBreakdown,
    };
  }

  /**
   * API pubblica: verifica se c'e spazio per i gatti richiesti in tutti i giorni della finestra.
   */
  async checkAvailabilityForCats(
    tenantId: string,
    checkInDate: string,
    checkOutDate: string,
    catIds: string[],
  ): Promise<{
    available: boolean;
    cageAssignment: CageAssignment;
    dailyBreakdown: DailyBreakdown[];
    bottleneckDate: string | null;
  }> {
    const settings = await this.getSettings(tenantId);
    const { numSingole, numDoppie, cageOccupancyDays } = settings;

    // Carica i gatti richiesti
    const cats = await this.catRepository.find({
      where: { id: In(catIds) },
    });

    if (cats.length !== catIds.length) {
      throw new BadRequestException('Uno o piu gatti non trovati');
    }

    const cageAssignment = this.computeCageAssignment(cats);

    const startDate = new Date(checkInDate);
    const occupancyEndDate = new Date(startDate);
    occupancyEndDate.setDate(occupancyEndDate.getDate() + (cageOccupancyDays - 1));

    const dailyBreakdown: DailyBreakdown[] = [];
    let available = true;
    let bottleneckDate: string | null = null;

    const current = new Date(startDate);
    while (current <= occupancyEndDate) {
      const existingNeeds = await this.getRawNeedsForDate(tenantId, current, cageOccupancyDays);

      // Somma le necessita esistenti + quelle nuove
      const totalSingole = existingNeeds.singoleNeeded + cageAssignment.singoleNeeded;
      const totalDoppie = existingNeeds.doppieNeeded + cageAssignment.doppieNeeded;

      // Gestisci overflow
      let singoleOccupied = totalSingole;
      let doppieOccupied = totalDoppie;

      if (singoleOccupied > numSingole) {
        const overflow = singoleOccupied - numSingole;
        singoleOccupied = numSingole;
        doppieOccupied += overflow;
      }

      const dayAvailable = doppieOccupied <= numDoppie;

      dailyBreakdown.push({
        date: this.formatDate(current),
        singoleTotal: numSingole,
        singoleOccupied,
        singoleAvailable: Math.max(0, numSingole - singoleOccupied),
        doppieTotal: numDoppie,
        doppieOccupied,
        doppieAvailable: Math.max(0, numDoppie - doppieOccupied),
      });

      if (!dayAvailable && available) {
        available = false;
        bottleneckDate = this.formatDate(current);
      }

      current.setDate(current.getDate() + 1);
    }

    return { available, cageAssignment, dailyBreakdown, bottleneckDate };
  }

  /**
   * Check atomico con lock pessimistico (FOR UPDATE su tenant_settings) per serializzare
   * le conferme concorrenti. Usato dentro la transazione di convertFromQuote.
   */
  async assertAvailabilityOrThrow(
    tenantId: string,
    checkInDate: Date,
    checkOutDate: Date,
    catIds: string[],
    queryRunner: QueryRunner,
  ): Promise<void> {
    if (catIds.length === 0) return;

    // Lock pessimistico su tenant_settings per serializzare le conferme concorrenti
    const settings = await queryRunner.manager
      .getRepository(TenantSettings)
      .createQueryBuilder('ts')
      .setLock('pessimistic_write')
      .where('ts.tenantId = :tenantId', { tenantId })
      .getOne();

    if (!settings) {
      throw new BadRequestException('Configurazione tenant non trovata');
    }

    const { numSingole, numDoppie, cageOccupancyDays } = settings;

    if (numSingole === 0 && numDoppie === 0) {
      // Pool non configurato, skip check
      return;
    }

    // Carica i gatti
    const cats = await queryRunner.manager.getRepository(Cat).find({
      where: { id: In(catIds) },
    });

    if (cats.length === 0) return;

    const cageAssignment = this.computeCageAssignment(cats);

    // Verifica disponibilita per ogni giorno nella finestra di occupazione
    const startDate = new Date(checkInDate);
    const occupancyEndDate = new Date(startDate);
    occupancyEndDate.setDate(occupancyEndDate.getDate() + (cageOccupancyDays - 1));

    const current = new Date(startDate);
    while (current <= occupancyEndDate) {
      const existingNeeds = await this.getRawNeedsForDate(
        tenantId,
        current,
        cageOccupancyDays,
        queryRunner,
      );

      const totalSingole = existingNeeds.singoleNeeded + cageAssignment.singoleNeeded;
      const totalDoppie = existingNeeds.doppieNeeded + cageAssignment.doppieNeeded;

      // Overflow logic
      let singoleOverflow = 0;
      if (totalSingole > numSingole) {
        singoleOverflow = totalSingole - numSingole;
      }

      const doppieRequired = totalDoppie + singoleOverflow;

      if (doppieRequired > numDoppie) {
        const dateStr = this.formatDate(current);
        throw new BadRequestException(
          `Disponibilita insufficiente per il ${dateStr}: ` +
          `servono ${cageAssignment.singoleNeeded} singole e ${cageAssignment.doppieNeeded} doppie, ` +
          `ma la capacita residua non e sufficiente. ` +
          `Gabbie singole: ${numSingole - Math.min(existingNeeds.singoleNeeded, numSingole)} libere su ${numSingole}, ` +
          `Gabbie doppie: ${numDoppie - existingNeeds.doppieNeeded} libere su ${numDoppie}.`,
        );
      }

      current.setDate(current.getDate() + 1);
    }
  }

  private async getSettings(tenantId: string): Promise<TenantSettings> {
    let settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    if (!settings) {
      throw new BadRequestException('Configurazione tenant non trovata. Configurare le impostazioni del tenant.');
    }

    return settings;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
