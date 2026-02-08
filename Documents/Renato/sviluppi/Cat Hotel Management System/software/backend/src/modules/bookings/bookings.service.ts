import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Booking, BookingStatus } from './entities/booking.entity';
import { BookingLineItem, LineItemCategory, LineItemUnitType } from './entities/booking-line-item.entity';
import { BookingCat } from './entities/booking-cat.entity';
import { BookingStatusHistory } from './entities/booking-status-history.entity';
import { BookingDailyOverride } from './entities/booking-daily-override.entity';
import { Quote, QuoteStatus } from '../quotes/entities/quote.entity';
import { Payment, PaymentType } from '../payments/entities/payment.entity';
import { TenantSettings } from '../tenants/entities/tenant-settings.entity';
import { PriceListService } from '../price-list/price-list.service';
import { TenantPriceOverridesService } from '../tenant-price-overrides/tenant-price-overrides.service';
import { ConvertQuoteDto, UpdateBookingDto, ChangeStatusDto, AddExtraDto, CreateDailyOverrideDto } from './dto';
import { AvailabilityService } from '../availability/availability.service';

// Valid state transitions
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  [BookingStatus.CONFERMATA]: [BookingStatus.CHECK_IN, BookingStatus.CANCELLATA, BookingStatus.SCADUTA],
  [BookingStatus.CHECK_IN]: [BookingStatus.IN_CORSO, BookingStatus.CANCELLATA],
  [BookingStatus.IN_CORSO]: [BookingStatus.CHECK_OUT, BookingStatus.CANCELLATA],
  [BookingStatus.CHECK_OUT]: [BookingStatus.CHIUSA, BookingStatus.RIMBORSATA],
  [BookingStatus.CHIUSA]: [],
  [BookingStatus.CANCELLATA]: [BookingStatus.RIMBORSATA],
  [BookingStatus.RIMBORSATA]: [],
  [BookingStatus.SCADUTA]: [],
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(BookingLineItem)
    private lineItemRepository: Repository<BookingLineItem>,
    @InjectRepository(BookingCat)
    private bookingCatRepository: Repository<BookingCat>,
    @InjectRepository(BookingStatusHistory)
    private statusHistoryRepository: Repository<BookingStatusHistory>,
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(TenantSettings)
    private tenantSettingsRepository: Repository<TenantSettings>,
    @InjectRepository(BookingDailyOverride)
    private dailyOverrideRepository: Repository<BookingDailyOverride>,
    private priceListService: PriceListService,
    private priceOverridesService: TenantPriceOverridesService,
    private availabilityService: AvailabilityService,
    private dataSource: DataSource,
  ) {}

  async convertFromQuote(
    tenantId: string,
    dto: ConvertQuoteDto,
    userId: string,
  ): Promise<Booking> {
    // Get quote with all relations
    const quote = await this.quoteRepository.findOne({
      where: { id: dto.quoteId, tenantId },
      relations: ['lineItems', 'quoteCats', 'client', 'tenant'],
    });

    if (!quote) {
      throw new NotFoundException('Preventivo non trovato');
    }

    // Check quote status - can only convert if sent or accepted
    if (![QuoteStatus.SENT, QuoteStatus.ACCEPTED].includes(quote.status)) {
      throw new BadRequestException(
        `Impossibile convertire un preventivo in stato "${quote.status}". Il preventivo deve essere in stato "sent" o "accepted".`,
      );
    }

    // Check if already converted
    const existingBooking = await this.bookingRepository.findOne({
      where: { id: quote.id },
    });
    if (existingBooking) {
      throw new ConflictException('Questo preventivo è già stato convertito in prenotazione');
    }

    // Get tenant settings for payment percentages
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    const depositPercentage = settings?.depositPercentage || 50;
    const checkinPaymentPercentage = settings?.checkinPaymentPercentage || 30;
    const checkoutPaymentPercentage = settings?.checkoutPaymentPercentage || 20;

    const totalAmount = Number(quote.totalAmount);
    const depositRequired = Math.round((totalAmount * depositPercentage) / 100 * 100) / 100;
    const checkinPaymentRequired = Math.round((totalAmount * checkinPaymentPercentage) / 100 * 100) / 100;
    const checkoutPaymentRequired = Math.round((totalAmount * checkoutPaymentPercentage) / 100 * 100) / 100;

    // Generate booking number
    const bookingNumber = await this.generateBookingNumber(tenantId);

    // Use transaction for data integrity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Check cage availability (with pessimistic lock)
      const catIds = (quote.quoteCats || []).map(qc => qc.catId);
      await this.availabilityService.assertAvailabilityOrThrow(
        tenantId,
        quote.checkInDate,
        quote.checkOutDate,
        catIds,
        queryRunner,
      );

      // Create booking with same ID as quote
      const booking = this.bookingRepository.create({
        id: quote.id, // Same ID as quote
        tenantId,
        quoteId: quote.id,
        clientId: quote.clientId,
        bookingNumber,
        checkInDate: quote.checkInDate,
        checkOutDate: quote.checkOutDate,
        numberOfCats: quote.numberOfCats,
        numberOfNights: quote.numberOfNights,
        subtotalBeforeDiscounts: quote.subtotalBeforeDiscounts,
        totalDiscounts: quote.totalDiscounts,
        totalAmount: quote.totalAmount,
        appliedDiscounts: quote.appliedDiscounts,
        status: BookingStatus.CONFERMATA,
        depositRequired,
        checkinPaymentRequired,
        checkoutPaymentRequired,
        notes: dto.notes || quote.notes,
        createdBy: userId,
        updatedBy: userId,
      });

      await queryRunner.manager.save(booking);

      // Copy line items
      for (const quoteLineItem of quote.lineItems || []) {
        const bookingLineItem = this.lineItemRepository.create({
          bookingId: booking.id,
          priceListItemId: quoteLineItem.priceListItemId,
          itemCode: quoteLineItem.itemCode,
          itemName: quoteLineItem.itemName,
          category: quoteLineItem.category as unknown as LineItemCategory,
          unitType: quoteLineItem.unitType as unknown as LineItemUnitType,
          seasonType: quoteLineItem.seasonType,
          startDate: quoteLineItem.startDate,
          endDate: quoteLineItem.endDate,
          appliesToCatCount: quoteLineItem.appliesToCatCount,
          unitPrice: quoteLineItem.unitPrice,
          quantity: quoteLineItem.quantity,
          subtotal: quoteLineItem.subtotal,
          discountAmount: quoteLineItem.discountAmount,
          total: quoteLineItem.total,
          lineOrder: quoteLineItem.lineOrder,
          addedDuringStay: false,
          createdBy: userId,
          updatedBy: userId,
        });
        await queryRunner.manager.save(bookingLineItem);
      }

      // Copy cats
      for (const quoteCat of quote.quoteCats || []) {
        const bookingCat = this.bookingCatRepository.create({
          bookingId: booking.id,
          catId: quoteCat.catId,
          notes: quoteCat.notes,
        });
        await queryRunner.manager.save(bookingCat);
      }

      // Create initial status history
      const statusHistory = this.statusHistoryRepository.create({
        bookingId: booking.id,
        fromStatus: null,
        toStatus: BookingStatus.CONFERMATA,
        changedBy: userId,
        notes: 'Conversione da preventivo',
      });
      await queryRunner.manager.save(statusHistory);

      // Soft delete the quote and update status to CONVERTED
      await queryRunner.manager.update(Quote, quote.id, {
        status: QuoteStatus.CONVERTED,
        deletedAt: new Date(),
        updatedBy: userId,
      });

      await queryRunner.commitTransaction();

      return this.findById(booking.id, tenantId);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    tenantId: string,
    options?: {
      status?: BookingStatus;
      clientId?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: Booking[]; total: number }> {
    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.bookingCats', 'bookingCats')
      .leftJoinAndSelect('bookingCats.cat', 'cat')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.deletedAt IS NULL');

    if (options?.status) {
      queryBuilder.andWhere('booking.status = :status', { status: options.status });
    }

    if (options?.clientId) {
      queryBuilder.andWhere('booking.clientId = :clientId', { clientId: options.clientId });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(booking.bookingNumber LIKE :search OR client.firstName LIKE :search OR client.lastName LIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('booking.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: [
        'client',
        'tenant',
        'lineItems',
        'bookingCats',
        'bookingCats.cat',
        'statusHistory',
        'statusHistory.changedByUser',
        'dailyOverrides',
        'dailyOverrides.createdByUser',
      ],
    });

    if (!booking) {
      throw new NotFoundException('Prenotazione non trovata');
    }

    return booking;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateBookingDto,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findById(id, tenantId);

    // Only allow updates in certain states
    if ([BookingStatus.CHIUSA, BookingStatus.CANCELLATA, BookingStatus.RIMBORSATA].includes(booking.status)) {
      throw new BadRequestException('Impossibile modificare una prenotazione chiusa, cancellata o rimborsata');
    }

    Object.assign(booking, dto, { updatedBy: userId });
    await this.bookingRepository.save(booking);

    return this.findById(id, tenantId);
  }

  async changeStatus(
    id: string,
    tenantId: string,
    dto: ChangeStatusDto,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findById(id, tenantId);
    const currentStatus = booking.status;
    const newStatus = dto.status;

    // Validate transition
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Transizione di stato non valida da "${currentStatus}" a "${newStatus}"`,
      );
    }

    // Special validation: check deposit before allowing CHECK_IN
    if (newStatus === BookingStatus.CHECK_IN) {
      const totalDeposit = await this.getTotalPayments(id, [PaymentType.CAPARRA]);
      if (totalDeposit < Number(booking.depositRequired)) {
        throw new BadRequestException(
          `Caparra insufficiente. Richiesta: €${booking.depositRequired}, Versata: €${totalDeposit}`,
        );
      }
    }

    // Update status
    booking.status = newStatus;
    booking.updatedBy = userId;
    await this.bookingRepository.save(booking);

    // Record status history
    const statusHistory = this.statusHistoryRepository.create({
      bookingId: booking.id,
      fromStatus: currentStatus,
      toStatus: newStatus,
      changedBy: userId,
      notes: dto.notes,
    });
    await this.statusHistoryRepository.save(statusHistory);

    return this.findById(id, tenantId);
  }

  async addExtra(
    id: string,
    tenantId: string,
    dto: AddExtraDto,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findById(id, tenantId);

    // Only allow adding extras in certain states
    if (![BookingStatus.CONFERMATA, BookingStatus.CHECK_IN, BookingStatus.IN_CORSO].includes(booking.status)) {
      throw new BadRequestException('Impossibile aggiungere extra in questo stato');
    }

    // Get price list item
    const priceItem = await this.priceListService.findByCode(dto.itemCode);
    if (!priceItem) {
      throw new NotFoundException(`Voce listino "${dto.itemCode}" non trovata`);
    }

    // Get effective price (with tenant override if exists)
    const override = await this.priceOverridesService.findByItemId(priceItem.id, tenantId);
    const unitPrice = override?.basePrice ? Number(override.basePrice) : Number(priceItem.basePrice);

    const quantity = dto.quantity || 1;
    const catCount = dto.appliesToCatCount || booking.numberOfCats;
    const subtotal = unitPrice * quantity * catCount;

    // Get max line order
    const maxOrder = Math.max(...booking.lineItems.map(li => li.lineOrder), 0);

    // Create line item
    const lineItem = this.lineItemRepository.create({
      bookingId: booking.id,
      priceListItemId: priceItem.id,
      itemCode: priceItem.code,
      itemName: priceItem.name,
      category: priceItem.category as unknown as LineItemCategory,
      unitType: priceItem.unitType as unknown as LineItemUnitType,
      seasonType: null,
      startDate: null,
      endDate: null,
      appliesToCatCount: dto.appliesToCatCount || null,
      unitPrice,
      quantity,
      subtotal,
      discountAmount: 0,
      total: subtotal,
      lineOrder: maxOrder + 1,
      addedDuringStay: true,
      createdBy: userId,
      updatedBy: userId,
    });
    await this.lineItemRepository.save(lineItem);

    // Recalculate totals
    await this.recalculateTotals(id, tenantId, userId);

    return this.findById(id, tenantId);
  }

  async removeExtra(
    id: string,
    lineItemId: string,
    tenantId: string,
    userId: string,
  ): Promise<Booking> {
    const booking = await this.findById(id, tenantId);

    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, bookingId: id },
    });

    if (!lineItem) {
      throw new NotFoundException('Riga non trovata');
    }

    if (!lineItem.addedDuringStay) {
      throw new BadRequestException('Impossibile rimuovere righe originali del preventivo');
    }

    await this.lineItemRepository.softDelete(lineItemId);

    // Recalculate totals
    await this.recalculateTotals(id, tenantId, userId);

    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const booking = await this.findById(id, tenantId);

    if (![BookingStatus.CANCELLATA, BookingStatus.SCADUTA].includes(booking.status)) {
      throw new BadRequestException('Solo prenotazioni cancellate o scadute possono essere eliminate');
    }

    await this.bookingRepository.softDelete(id);
  }

  async getTotalPayments(bookingId: string, types?: PaymentType[]): Promise<number> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.bookingId = :bookingId', { bookingId });

    if (types && types.length > 0) {
      queryBuilder.andWhere('payment.paymentType IN (:...types)', { types });
    }

    const payments = await queryBuilder.getMany();
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  }

  async getPaymentsSummary(bookingId: string): Promise<{
    depositPaid: number;
    checkinPaid: number;
    checkoutPaid: number;
    extrasPaid: number;
    refunds: number;
    totalPaid: number;
  }> {
    const payments = await this.paymentRepository.find({
      where: { bookingId },
    });

    const summary = {
      depositPaid: 0,
      checkinPaid: 0,
      checkoutPaid: 0,
      extrasPaid: 0,
      refunds: 0,
      totalPaid: 0,
    };

    for (const payment of payments) {
      const amount = Number(payment.amount);
      switch (payment.paymentType) {
        case PaymentType.CAPARRA:
          summary.depositPaid += amount;
          break;
        case PaymentType.ACCONTO_CHECKIN:
          summary.checkinPaid += amount;
          break;
        case PaymentType.SALDO_CHECKOUT:
          summary.checkoutPaid += amount;
          break;
        case PaymentType.EXTRA:
          summary.extrasPaid += amount;
          break;
        case PaymentType.RIMBORSO:
          summary.refunds += amount; // Note: rimborso amount is negative
          break;
      }
    }

    summary.totalPaid = summary.depositPaid + summary.checkinPaid + summary.checkoutPaid + summary.extrasPaid + summary.refunds;

    return summary;
  }

  async createDailyOverride(
    bookingId: string,
    tenantId: string,
    dto: CreateDailyOverrideDto,
    userId: string,
  ): Promise<BookingDailyOverride> {
    const booking = await this.findById(bookingId, tenantId);

    // Verify booking is in an active status
    const activeStatuses = [BookingStatus.CONFERMATA, BookingStatus.CHECK_IN, BookingStatus.IN_CORSO];
    if (!activeStatuses.includes(booking.status)) {
      throw new BadRequestException(
        `Impossibile creare forzatura su prenotazione in stato "${booking.status}". Stati validi: confermata, check_in, in_corso.`,
      );
    }

    // Get occupancy days from tenant settings
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });
    const cageOccupancyDays = settings?.cageOccupancyDays || 4;

    // Verify overrideDate is within the occupancy window [checkInDate, checkInDate + occupancyDays - 1]
    const checkIn = new Date(booking.checkInDate);
    const windowEnd = new Date(checkIn);
    windowEnd.setDate(windowEnd.getDate() + cageOccupancyDays - 1);

    const overrideDate = new Date(dto.overrideDate);
    if (overrideDate < checkIn || overrideDate > windowEnd) {
      const formatD = (d: Date) => d.toISOString().split('T')[0];
      throw new BadRequestException(
        `La data forzatura ${dto.overrideDate} è fuori dalla finestra di occupazione gabbia [${formatD(checkIn)}, ${formatD(windowEnd)}].`,
      );
    }

    // Check for duplicates
    const existing = await this.dailyOverrideRepository.findOne({
      where: { bookingId, overrideDate: new Date(dto.overrideDate) },
    });
    if (existing) {
      throw new BadRequestException(
        `Esiste già una forzatura per la prenotazione ${bookingId} nella data ${dto.overrideDate}.`,
      );
    }

    const override = this.dailyOverrideRepository.create({
      tenantId,
      bookingId,
      overrideDate: new Date(dto.overrideDate),
      reason: dto.reason,
      createdBy: userId,
    });

    return this.dailyOverrideRepository.save(override);
  }

  async removeDailyOverride(
    bookingId: string,
    overrideId: string,
    tenantId: string,
  ): Promise<void> {
    const override = await this.dailyOverrideRepository.findOne({
      where: { id: overrideId, bookingId, tenantId },
    });

    if (!override) {
      throw new NotFoundException('Forzatura non trovata');
    }

    // Hard-delete with .remove() to trigger audit afterRemove
    await this.dailyOverrideRepository.remove(override);
  }

  async getDailyOverrides(
    bookingId: string,
    tenantId: string,
  ): Promise<BookingDailyOverride[]> {
    // Verify booking exists and belongs to tenant
    await this.findById(bookingId, tenantId);

    return this.dailyOverrideRepository.find({
      where: { bookingId, tenantId },
      relations: ['createdByUser'],
      order: { overrideDate: 'ASC' },
    });
  }

  private async recalculateTotals(id: string, tenantId: string, userId: string): Promise<void> {
    const booking = await this.findById(id, tenantId);

    const lineItems = await this.lineItemRepository.find({
      where: { bookingId: id, deletedAt: IsNull() },
    });

    const subtotalBeforeDiscounts = lineItems.reduce((sum, li) => sum + Number(li.subtotal), 0);
    const totalDiscounts = lineItems.reduce((sum, li) => sum + Number(li.discountAmount), 0);
    const totalAmount = subtotalBeforeDiscounts - totalDiscounts;

    // Recalculate payment requirements based on new total
    const settings = await this.tenantSettingsRepository.findOne({
      where: { tenantId },
    });

    const depositPercentage = settings?.depositPercentage || 50;
    const checkinPaymentPercentage = settings?.checkinPaymentPercentage || 30;
    const checkoutPaymentPercentage = settings?.checkoutPaymentPercentage || 20;

    await this.bookingRepository.update(id, {
      subtotalBeforeDiscounts,
      totalDiscounts,
      totalAmount,
      depositRequired: Math.round((totalAmount * depositPercentage) / 100 * 100) / 100,
      checkinPaymentRequired: Math.round((totalAmount * checkinPaymentPercentage) / 100 * 100) / 100,
      checkoutPaymentRequired: Math.round((totalAmount * checkoutPaymentPercentage) / 100 * 100) / 100,
      updatedBy: userId,
    });
  }

  private async generateBookingNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `B${year}`;

    const lastBooking = await this.bookingRepository
      .createQueryBuilder('booking')
      .where('booking.tenantId = :tenantId', { tenantId })
      .andWhere('booking.bookingNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('booking.bookingNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastBooking) {
      const lastNumber = parseInt(lastBooking.bookingNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }
}
