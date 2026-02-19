import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Quote, QuoteStatus, AppliedDiscountSnapshot } from './entities/quote.entity';
import { QuoteLineItem, LineItemCategory, LineItemUnitType, LineItemSeasonType } from './entities/quote-line-item.entity';
import { QuoteCat } from './entities/quote-cat.entity';
import { CreateQuoteDto, UpdateQuoteDto, AddLineItemDto, UpdateLineItemDto, UpdateStatusDto } from './dto';
import { PriceListService } from '../price-list/price-list.service';
import { PriceListItem, PriceListCategory, PriceListUnitType } from '../price-list/entities/price-list-item.entity';
import { TenantPriceOverridesService } from '../tenant-price-overrides/tenant-price-overrides.service';
import { TenantPriceOverride } from '../tenant-price-overrides/entities/tenant-price-override.entity';
import { SeasonalPeriodsService } from '../seasonal-periods/seasonal-periods.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { DiscountRule } from '../discount-rules/entities/discount-rule.entity';
import { CatsService } from '../cats/cats.service';
import { PdfService } from '../pdf/pdf.service';

interface SeasonalSegment {
  startDate: Date;
  endDate: Date;
  seasonType: 'high' | 'low';
  nights: number;
}

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote)
    private quoteRepository: Repository<Quote>,
    @InjectRepository(QuoteLineItem)
    private lineItemRepository: Repository<QuoteLineItem>,
    @InjectRepository(QuoteCat)
    private quoteCatRepository: Repository<QuoteCat>,
    private readonly priceListService: PriceListService,
    private readonly overridesService: TenantPriceOverridesService,
    private readonly seasonalService: SeasonalPeriodsService,
    private readonly discountRulesService: DiscountRulesService,
    private readonly catsService: CatsService,
    private readonly pdfService: PdfService,
    private dataSource: DataSource,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateQuoteDto,
    userId: string,
  ): Promise<Quote> {
    const checkIn = new Date(createDto.checkInDate);
    const checkOut = new Date(createDto.checkOutDate);

    if (checkOut <= checkIn) {
      throw new BadRequestException('La data di check-out deve essere successiva al check-in');
    }

    const numberOfCats = createDto.catIds.length;

    // Verify all cats exist and belong to the tenant
    for (const catId of createDto.catIds) {
      await this.catsService.findById(catId, tenantId);
    }

    // Generate quote number
    const quoteNumber = await this.generateQuoteNumber(tenantId);

    // Get price overrides for tenant
    const overridesMap = await this.overridesService.getActiveOverridesMap(tenantId);

    // Create the quote
    const quote = this.quoteRepository.create({
      tenantId,
      clientId: createDto.clientId,
      quoteNumber,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfCats,
      status: QuoteStatus.DRAFT,
      validUntil: createDto.validUntil ? new Date(createDto.validUntil) : null,
      notes: createDto.notes || null,
      createdBy: userId,
      updatedBy: userId,
    });

    const savedQuote = await this.quoteRepository.save(quote);

    // Create quote-cat associations
    for (const catId of createDto.catIds) {
      const quoteCat = this.quoteCatRepository.create({
        quoteId: savedQuote.id,
        catId,
      });
      await this.quoteCatRepository.save(quoteCat);
    }

    // Get accommodation item
    let accommodationItem: PriceListItem;
    if (createDto.accommodationItemCode) {
      accommodationItem = await this.priceListService.findByCode(createDto.accommodationItemCode);
    } else {
      const accommodationItems = await this.priceListService.findActiveByCategory(PriceListCategory.ACCOMMODATION);
      if (accommodationItems.length === 0) {
        throw new BadRequestException('Nessun item di soggiorno attivo nel listino');
      }
      accommodationItem = accommodationItems[0];
    }

    // Calculate seasonal segments and create accommodation line items
    const segments = await this.calculateSeasonalSegments(checkIn, checkOut);
    let lineOrder = 0;

    for (const segment of segments) {
      const unitPrice = this.getItemPrice(accommodationItem, segment.seasonType === 'high', overridesMap);
      const quantity = segment.nights;
      const subtotal = unitPrice * quantity * numberOfCats;

      const lineItem = this.lineItemRepository.create({
        quoteId: savedQuote.id,
        priceListItemId: accommodationItem.id,
        itemCode: accommodationItem.code,
        itemName: accommodationItem.name,
        category: LineItemCategory.ACCOMMODATION,
        unitType: this.mapUnitType(accommodationItem.unitType),
        seasonType: segment.seasonType === 'high' ? LineItemSeasonType.HIGH : LineItemSeasonType.LOW,
        startDate: segment.startDate,
        endDate: segment.endDate,
        appliesToCatCount: null, // Applies to all cats
        unitPrice,
        quantity,
        subtotal,
        discountAmount: 0,
        total: subtotal,
        lineOrder: lineOrder++,
        createdBy: userId,
        updatedBy: userId,
      });

      await this.lineItemRepository.save(lineItem);
    }

    // Add extra services if provided
    if (createDto.extraServices && createDto.extraServices.length > 0) {
      for (const extraService of createDto.extraServices) {
        const item = await this.priceListService.findByCode(extraService.itemCode);
        const isHighSeason = await this.seasonalService.isHighSeason(checkIn);
        const unitPrice = this.getItemPrice(item, isHighSeason, overridesMap);
        const quantity = extraService.quantity || 1;
        const catCount = extraService.appliesToCatCount || numberOfCats;
        const subtotal = unitPrice * quantity * catCount;

        const lineItem = this.lineItemRepository.create({
          quoteId: savedQuote.id,
          priceListItemId: item.id,
          itemCode: item.code,
          itemName: item.name,
          category: LineItemCategory.EXTRA_SERVICE,
          unitType: this.mapUnitType(item.unitType),
          seasonType: isHighSeason ? LineItemSeasonType.HIGH : LineItemSeasonType.LOW,
          startDate: null,
          endDate: null,
          appliesToCatCount: extraService.appliesToCatCount || null,
          unitPrice,
          quantity,
          subtotal,
          discountAmount: 0,
          total: subtotal,
          lineOrder: lineOrder++,
          createdBy: userId,
          updatedBy: userId,
        });

        await this.lineItemRepository.save(lineItem);
      }
    }

    // Calculate totals and apply discounts
    await this.recalculateTotals(savedQuote.id, tenantId, userId);

    return this.findById(savedQuote.id, tenantId);
  }

  async findAll(
    tenantId: string,
    options?: {
      status?: QuoteStatus;
      clientId?: string;
      search?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: Quote[]; total: number }> {
    const queryBuilder = this.quoteRepository
      .createQueryBuilder('quote')
      .leftJoinAndSelect('quote.client', 'client')
      .leftJoinAndSelect('quote.quoteCats', 'quoteCats')
      .leftJoinAndSelect('quoteCats.cat', 'cat')
      .where('quote.tenantId = :tenantId', { tenantId });

    if (options?.status) {
      queryBuilder.andWhere('quote.status = :status', { status: options.status });
    }

    if (options?.clientId) {
      queryBuilder.andWhere('quote.clientId = :clientId', { clientId: options.clientId });
    }

    if (options?.search) {
      queryBuilder.andWhere(
        '(quote.quoteNumber LIKE :search OR client.firstName LIKE :search OR client.lastName LIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('quote.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id, tenantId },
      relations: ['client', 'lineItems', 'quoteCats', 'quoteCats.cat'],
    });

    if (!quote) {
      throw new NotFoundException('Preventivo non trovato');
    }

    // Sort line items by lineOrder
    if (quote.lineItems) {
      quote.lineItems.sort((a, b) => a.lineOrder - b.lineOrder);
    }

    return quote;
  }

  async update(
    id: string,
    tenantId: string,
    updateDto: UpdateQuoteDto,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.findById(id, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ForbiddenException('Solo i preventivi in bozza possono essere modificati');
    }

    // Update basic fields
    if (updateDto.clientId) {
      quote.clientId = updateDto.clientId;
    }
    if (updateDto.notes !== undefined) {
      quote.notes = updateDto.notes;
    }
    if (updateDto.validUntil) {
      quote.validUntil = new Date(updateDto.validUntil);
    }

    // If dates or cats changed, need to recalculate
    let needsRecalculation = false;

    if (updateDto.checkInDate || updateDto.checkOutDate) {
      const newCheckIn = updateDto.checkInDate ? new Date(updateDto.checkInDate) : quote.checkInDate;
      const newCheckOut = updateDto.checkOutDate ? new Date(updateDto.checkOutDate) : quote.checkOutDate;

      if (newCheckOut <= newCheckIn) {
        throw new BadRequestException('La data di check-out deve essere successiva al check-in');
      }

      quote.checkInDate = newCheckIn;
      quote.checkOutDate = newCheckOut;
      needsRecalculation = true;
    }

    if (updateDto.catIds) {
      // Verify all cats exist
      for (const catId of updateDto.catIds) {
        await this.catsService.findById(catId, tenantId);
      }

      // Remove existing quote-cat associations
      await this.quoteCatRepository.delete({ quoteId: quote.id });

      // Create new associations
      for (const catId of updateDto.catIds) {
        const quoteCat = this.quoteCatRepository.create({
          quoteId: quote.id,
          catId,
        });
        await this.quoteCatRepository.save(quoteCat);
      }

      quote.numberOfCats = updateDto.catIds.length;
      needsRecalculation = true;
    }

    quote.updatedBy = userId;
    await this.quoteRepository.save(quote);

    if (needsRecalculation) {
      // Remove existing accommodation line items and recalculate
      await this.lineItemRepository.delete({
        quoteId: quote.id,
        category: LineItemCategory.ACCOMMODATION,
      });

      const overridesMap = await this.overridesService.getActiveOverridesMap(tenantId);
      const accommodationItems = await this.priceListService.findActiveByCategory(PriceListCategory.ACCOMMODATION);

      if (accommodationItems.length > 0) {
        const accommodationItem = accommodationItems[0];
        const segments = await this.calculateSeasonalSegments(quote.checkInDate, quote.checkOutDate);

        let lineOrder = 0;
        for (const segment of segments) {
          const unitPrice = this.getItemPrice(accommodationItem, segment.seasonType === 'high', overridesMap);
          const quantity = segment.nights;
          const subtotal = unitPrice * quantity * quote.numberOfCats;

          const lineItem = this.lineItemRepository.create({
            quoteId: quote.id,
            priceListItemId: accommodationItem.id,
            itemCode: accommodationItem.code,
            itemName: accommodationItem.name,
            category: LineItemCategory.ACCOMMODATION,
            unitType: this.mapUnitType(accommodationItem.unitType),
            seasonType: segment.seasonType === 'high' ? LineItemSeasonType.HIGH : LineItemSeasonType.LOW,
            startDate: segment.startDate,
            endDate: segment.endDate,
            appliesToCatCount: null,
            unitPrice,
            quantity,
            subtotal,
            discountAmount: 0,
            total: subtotal,
            lineOrder: lineOrder++,
            createdBy: userId,
            updatedBy: userId,
          });

          await this.lineItemRepository.save(lineItem);
        }
      }

      // Recalculate extra services for new cat count
      const extraServices = await this.lineItemRepository.find({
        where: { quoteId: quote.id, category: LineItemCategory.EXTRA_SERVICE },
      });

      for (const service of extraServices) {
        const catCount = service.appliesToCatCount || quote.numberOfCats;
        service.subtotal = Number(service.unitPrice) * service.quantity * catCount;
        service.total = service.subtotal - Number(service.discountAmount);
        service.updatedBy = userId;
        await this.lineItemRepository.save(service);
      }

      await this.recalculateTotals(quote.id, tenantId, userId);
    }

    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const quote = await this.findById(id, tenantId);
    await this.quoteRepository.softDelete(quote.id);
  }

  async addLineItem(
    quoteId: string,
    tenantId: string,
    addDto: AddLineItemDto,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ForbiddenException('Solo i preventivi in bozza possono essere modificati');
    }

    const item = await this.priceListService.findByCode(addDto.itemCode);
    const overridesMap = await this.overridesService.getActiveOverridesMap(tenantId);
    const isHighSeason = await this.seasonalService.isHighSeason(quote.checkInDate);
    const unitPrice = this.getItemPrice(item, isHighSeason, overridesMap);
    const quantity = addDto.quantity || 1;
    const catCount = addDto.appliesToCatCount || quote.numberOfCats;
    const subtotal = unitPrice * quantity * catCount;

    // Get max line order
    const maxOrder = await this.lineItemRepository
      .createQueryBuilder('item')
      .where('item.quoteId = :quoteId', { quoteId })
      .select('MAX(item.lineOrder)', 'maxOrder')
      .getRawOne();

    const lineItem = this.lineItemRepository.create({
      quoteId: quote.id,
      priceListItemId: item.id,
      itemCode: item.code,
      itemName: item.name,
      category: item.category === PriceListCategory.ACCOMMODATION
        ? LineItemCategory.ACCOMMODATION
        : LineItemCategory.EXTRA_SERVICE,
      unitType: this.mapUnitType(item.unitType),
      seasonType: isHighSeason ? LineItemSeasonType.HIGH : LineItemSeasonType.LOW,
      startDate: null,
      endDate: null,
      appliesToCatCount: addDto.appliesToCatCount || null,
      unitPrice,
      quantity,
      subtotal,
      discountAmount: 0,
      total: subtotal,
      lineOrder: (maxOrder?.maxOrder || 0) + 1,
      createdBy: userId,
      updatedBy: userId,
    });

    await this.lineItemRepository.save(lineItem);
    await this.recalculateTotals(quoteId, tenantId, userId);

    return this.findById(quoteId, tenantId);
  }

  async updateLineItem(
    quoteId: string,
    lineItemId: string,
    tenantId: string,
    updateDto: UpdateLineItemDto,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ForbiddenException('Solo i preventivi in bozza possono essere modificati');
    }

    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, quoteId },
    });

    if (!lineItem) {
      throw new NotFoundException('Riga preventivo non trovata');
    }

    if (updateDto.quantity !== undefined) {
      lineItem.quantity = updateDto.quantity;
    }

    if (updateDto.appliesToCatCount !== undefined) {
      lineItem.appliesToCatCount = updateDto.appliesToCatCount;
    }

    // Recalculate subtotal
    const catCount = lineItem.appliesToCatCount || quote.numberOfCats;
    lineItem.subtotal = Number(lineItem.unitPrice) * lineItem.quantity * catCount;
    lineItem.total = lineItem.subtotal - Number(lineItem.discountAmount);
    lineItem.updatedBy = userId;

    await this.lineItemRepository.save(lineItem);
    await this.recalculateTotals(quoteId, tenantId, userId);

    return this.findById(quoteId, tenantId);
  }

  async removeLineItem(
    quoteId: string,
    lineItemId: string,
    tenantId: string,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ForbiddenException('Solo i preventivi in bozza possono essere modificati');
    }

    const lineItem = await this.lineItemRepository.findOne({
      where: { id: lineItemId, quoteId },
    });

    if (!lineItem) {
      throw new NotFoundException('Riga preventivo non trovata');
    }

    await this.lineItemRepository.softDelete(lineItem.id);
    await this.recalculateTotals(quoteId, tenantId, userId);

    return this.findById(quoteId, tenantId);
  }

  async recalculate(
    quoteId: string,
    tenantId: string,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new ForbiddenException('Solo i preventivi in bozza possono essere ricalcolati');
    }

    // Get fresh prices from price list
    const overridesMap = await this.overridesService.getActiveOverridesMap(tenantId);

    for (const lineItem of quote.lineItems) {
      if (lineItem.priceListItemId) {
        try {
          const item = await this.priceListService.findById(lineItem.priceListItemId);
          const isHighSeason = lineItem.seasonType === LineItemSeasonType.HIGH;
          const newUnitPrice = this.getItemPrice(item, isHighSeason, overridesMap);

          lineItem.unitPrice = newUnitPrice;
          const catCount = lineItem.appliesToCatCount || quote.numberOfCats;
          lineItem.subtotal = newUnitPrice * lineItem.quantity * catCount;
          lineItem.total = lineItem.subtotal - Number(lineItem.discountAmount);
          lineItem.updatedBy = userId;

          await this.lineItemRepository.save(lineItem);
        } catch (error) {
          // Item might have been deleted, keep current price
        }
      }
    }

    await this.recalculateTotals(quoteId, tenantId, userId);

    return this.findById(quoteId, tenantId);
  }

  async updateStatus(
    quoteId: string,
    tenantId: string,
    statusDto: UpdateStatusDto,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.findById(quoteId, tenantId);

    // Validate status transitions
    const validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
      [QuoteStatus.DRAFT]: [QuoteStatus.SENT],
      [QuoteStatus.SENT]: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED, QuoteStatus.EXPIRED, QuoteStatus.DRAFT],
      [QuoteStatus.ACCEPTED]: [QuoteStatus.CONVERTED],
      [QuoteStatus.REJECTED]: [],
      [QuoteStatus.EXPIRED]: [QuoteStatus.DRAFT],
      [QuoteStatus.CONVERTED]: [],
    };

    if (!validTransitions[quote.status].includes(statusDto.status)) {
      throw new BadRequestException(
        `Transizione di stato non valida: da ${quote.status} a ${statusDto.status}`,
      );
    }

    quote.status = statusDto.status;
    quote.updatedBy = userId;

    await this.quoteRepository.save(quote);

    return this.findById(quoteId, tenantId);
  }

  async generatePdf(
    quoteId: string,
    tenantId: string,
    userId: string,
  ): Promise<Quote> {
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId, tenantId },
      relations: ['tenant', 'client', 'lineItems', 'quoteCats', 'quoteCats.cat'],
    });

    if (!quote) {
      throw new NotFoundException('Preventivo non trovato');
    }

    // Sort line items by lineOrder
    if (quote.lineItems) {
      quote.lineItems.sort((a, b) => a.lineOrder - b.lineOrder);
    }

    // Delete old PDF if exists
    if (quote.pdfPath) {
      this.pdfService.deleteFile(quote.pdfPath);
    }

    // Generate new PDF
    const pdfPath = await this.pdfService.generateQuotePdf(quote);

    // Update quote with PDF path
    quote.pdfPath = pdfPath;
    quote.pdfGeneratedAt = new Date();
    quote.updatedBy = userId;

    await this.quoteRepository.save(quote);

    return this.findById(quoteId, tenantId);
  }

  private async generateQuoteNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `Q${year}`;

    // Get the last quote number for this tenant in this year
    const lastQuote = await this.quoteRepository
      .createQueryBuilder('quote')
      .where('quote.tenantId = :tenantId', { tenantId })
      .andWhere('quote.quoteNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('quote.quoteNumber', 'DESC')
      .getOne();

    let nextNumber = 1;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quoteNumber.replace(prefix, ''), 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
  }

  private async calculateSeasonalSegments(
    checkIn: Date,
    checkOut: Date,
  ): Promise<SeasonalSegment[]> {
    const segments: SeasonalSegment[] = [];
    let currentDate = new Date(checkIn);
    let segmentStart = new Date(checkIn);
    let currentSeasonType = await this.seasonalService.getSeasonType(currentDate);
    let nightCount = 0;

    while (currentDate < checkOut) {
      const daySeasonType = await this.seasonalService.getSeasonType(currentDate);

      if (daySeasonType !== currentSeasonType && nightCount > 0) {
        // Season changed, close current segment
        segments.push({
          startDate: new Date(segmentStart),
          endDate: new Date(currentDate),
          seasonType: currentSeasonType,
          nights: nightCount,
        });

        // Start new segment
        segmentStart = new Date(currentDate);
        currentSeasonType = daySeasonType;
        nightCount = 0;
      }

      nightCount++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Close the last segment
    if (nightCount > 0) {
      segments.push({
        startDate: new Date(segmentStart),
        endDate: new Date(checkOut),
        seasonType: currentSeasonType,
        nights: nightCount,
      });
    }

    return segments;
  }

  private getItemPrice(
    item: PriceListItem,
    isHighSeason: boolean,
    overridesMap: Map<string, TenantPriceOverride>,
  ): number {
    const override = overridesMap.get(item.id);

    if (override) {
      if (isHighSeason && override.highSeasonPrice !== null) {
        return Number(override.highSeasonPrice);
      }
      if (!isHighSeason && override.basePrice !== null) {
        return Number(override.basePrice);
      }
      if (isHighSeason && override.basePrice !== null) {
        return Number(override.basePrice);
      }
      if (!isHighSeason && override.highSeasonPrice !== null) {
        return Number(override.highSeasonPrice);
      }
    }

    if (isHighSeason && item.highSeasonPrice !== null) {
      return Number(item.highSeasonPrice);
    }
    return Number(item.basePrice);
  }

  private mapUnitType(priceListUnitType: PriceListUnitType): LineItemUnitType {
    const mapping: Record<PriceListUnitType, LineItemUnitType> = {
      [PriceListUnitType.PER_NIGHT]: LineItemUnitType.PER_NIGHT,
      [PriceListUnitType.PER_DAY]: LineItemUnitType.PER_DAY,
      [PriceListUnitType.ONE_TIME]: LineItemUnitType.ONE_TIME,
      [PriceListUnitType.PER_HOUR]: LineItemUnitType.PER_HOUR,
    };
    return mapping[priceListUnitType];
  }

  private async recalculateTotals(
    quoteId: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const quote = await this.quoteRepository.findOne({
      where: { id: quoteId },
      relations: ['lineItems'],
    });

    if (!quote) return;

    const checkIn = new Date(quote.checkInDate);
    const checkOut = new Date(quote.checkOutDate);
    const numberOfNights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Calculate subtotal before discounts
    let subtotalBeforeDiscounts = 0;
    for (const lineItem of quote.lineItems) {
      subtotalBeforeDiscounts += Number(lineItem.subtotal);
    }

    // Get applicable discount rules
    const accommodationRules = await this.discountRulesService.getApplicableRules(
      tenantId,
      PriceListCategory.ACCOMMODATION,
      numberOfNights,
      quote.numberOfCats,
      checkIn,
    );

    const extraServiceRules = await this.discountRulesService.getApplicableRules(
      tenantId,
      PriceListCategory.EXTRA_SERVICE,
      numberOfNights,
      quote.numberOfCats,
      checkIn,
    );

    // Apply discounts to line items
    const appliedDiscounts: AppliedDiscountSnapshot[] = [];
    let totalDiscounts = 0;

    // Apply discounts to accommodation items
    const accommodationItems = quote.lineItems.filter(
      (li) => li.category === LineItemCategory.ACCOMMODATION,
    );
    const accommodationSubtotal = accommodationItems.reduce(
      (sum, li) => sum + Number(li.subtotal),
      0,
    );

    const { discounts: accDiscounts, finalTotal: accFinal } = this.applyDiscounts(
      accommodationSubtotal,
      accommodationRules,
    );

    // Distribute accommodation discounts proportionally
    if (accDiscounts.length > 0) {
      const accTotalDiscount = accommodationSubtotal - accFinal;
      for (const item of accommodationItems) {
        const proportion = Number(item.subtotal) / accommodationSubtotal;
        item.discountAmount = Math.round(accTotalDiscount * proportion * 100) / 100;
        item.total = Number(item.subtotal) - item.discountAmount;
        await this.lineItemRepository.save(item);
      }

      for (const discount of accDiscounts) {
        appliedDiscounts.push(discount);
        totalDiscounts += Math.abs(discount.amount);
      }
    }

    // Apply discounts to extra service items
    const extraServiceItems = quote.lineItems.filter(
      (li) => li.category === LineItemCategory.EXTRA_SERVICE,
    );
    const extraServiceSubtotal = extraServiceItems.reduce(
      (sum, li) => sum + Number(li.subtotal),
      0,
    );

    if (extraServiceSubtotal > 0) {
      const { discounts: extraDiscounts, finalTotal: extraFinal } = this.applyDiscounts(
        extraServiceSubtotal,
        extraServiceRules,
      );

      if (extraDiscounts.length > 0) {
        const extraTotalDiscount = extraServiceSubtotal - extraFinal;
        for (const item of extraServiceItems) {
          const proportion = Number(item.subtotal) / extraServiceSubtotal;
          item.discountAmount = Math.round(extraTotalDiscount * proportion * 100) / 100;
          item.total = Number(item.subtotal) - item.discountAmount;
          await this.lineItemRepository.save(item);
        }

        for (const discount of extraDiscounts) {
          // Check if discount already applied (might be cumulative across categories)
          const existing = appliedDiscounts.find((d) => d.ruleId === discount.ruleId);
          if (existing) {
            existing.amount += discount.amount;
          } else {
            appliedDiscounts.push(discount);
          }
          totalDiscounts += Math.abs(discount.amount);
        }
      }
    }

    // Update quote totals
    const totalAmount = subtotalBeforeDiscounts - totalDiscounts;

    quote.subtotalBeforeDiscounts = Math.round(subtotalBeforeDiscounts * 100) / 100;
    quote.totalDiscounts = Math.round(totalDiscounts * 100) / 100;
    quote.totalAmount = Math.round(totalAmount * 100) / 100;
    quote.appliedDiscounts = appliedDiscounts.length > 0 ? appliedDiscounts : null;
    quote.updatedBy = userId;

    await this.quoteRepository.save(quote);
  }

  private applyDiscounts(
    amount: number,
    rules: DiscountRule[],
  ): { discounts: AppliedDiscountSnapshot[]; finalTotal: number } {
    const discounts: AppliedDiscountSnapshot[] = [];
    let finalTotal = amount;
    let hasAppliedNonCumulative = false;

    for (const rule of rules) {
      if (!rule.isCumulative && hasAppliedNonCumulative) {
        continue;
      }

      let discountAmount: number;
      if (rule.isPercentage) {
        discountAmount = (amount * Number(rule.discountValue)) / 100;
      } else {
        discountAmount = Number(rule.discountValue);
      }

      discountAmount = Math.min(discountAmount, finalTotal);

      if (discountAmount > 0) {
        discounts.push({
          ruleId: rule.id,
          name: rule.name,
          type: rule.discountType,
          value: Number(rule.discountValue),
          isPercentage: rule.isPercentage,
          amount: -Math.round(discountAmount * 100) / 100,
        });

        finalTotal -= discountAmount;

        if (!rule.isCumulative) {
          hasAppliedNonCumulative = true;
        }
      }
    }

    return { discounts, finalTotal: Math.max(0, finalTotal) };
  }
}
