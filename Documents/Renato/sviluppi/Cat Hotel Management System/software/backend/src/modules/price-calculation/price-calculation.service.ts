import { Injectable, NotFoundException } from '@nestjs/common';
import { PriceListService } from '../price-list/price-list.service';
import { TenantPriceOverridesService } from '../tenant-price-overrides/tenant-price-overrides.service';
import { SeasonalPeriodsService } from '../seasonal-periods/seasonal-periods.service';
import { DiscountRulesService } from '../discount-rules/discount-rules.service';
import { PriceListItem, PriceListCategory } from '../price-list/entities/price-list-item.entity';
import { TenantPriceOverride } from '../tenant-price-overrides/entities/tenant-price-override.entity';
import { DiscountRule, DiscountAppliesTo } from '../discount-rules/entities/discount-rule.entity';
import {
  CalculatePriceDto,
  CalculatePriceItemDto,
  PriceCalculationResult,
  PriceBreakdown,
  PriceLineItem,
  AppliedDiscount,
} from './dto';

@Injectable()
export class PriceCalculationService {
  constructor(
    private readonly priceListService: PriceListService,
    private readonly overridesService: TenantPriceOverridesService,
    private readonly seasonalService: SeasonalPeriodsService,
    private readonly discountRulesService: DiscountRulesService,
  ) {}

  async calculatePrice(
    tenantId: string,
    dto: CalculatePriceDto,
  ): Promise<PriceCalculationResult> {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);
    const numberOfNights = this.calculateNights(checkIn, checkOut);
    const numberOfCats = dto.numberOfCats;

    // Recupera override del tenant
    const overridesMap = await this.overridesService.getActiveOverridesMap(tenantId);

    // Calcola soggiorno (accommodation)
    const accommodationItems = await this.calculateAccommodation(
      tenantId,
      checkIn,
      checkOut,
      numberOfNights,
      numberOfCats,
      overridesMap,
    );

    // Calcola servizi extra
    const extraServiceItems = await this.calculateExtraServices(
      tenantId,
      dto.extraServices || [],
      checkIn,
      numberOfNights,
      numberOfCats,
      overridesMap,
    );

    // Calcola totali
    const accommodationSubtotal = accommodationItems.reduce((sum, item) => sum + item.total, 0);
    const extraServicesSubtotal = extraServiceItems.reduce((sum, item) => sum + item.total, 0);

    // Raccogli tutti gli sconti applicati
    const allDiscounts: AppliedDiscount[] = [
      ...accommodationItems.flatMap(item => item.discounts),
      ...extraServiceItems.flatMap(item => item.discounts),
    ];

    // Aggrega sconti per nome
    const discountsSummary = this.aggregateDiscounts(allDiscounts);

    const totalBeforeDiscounts = accommodationItems.reduce((sum, item) => sum + item.subtotal, 0)
      + extraServiceItems.reduce((sum, item) => sum + item.subtotal, 0);

    const totalDiscounts = discountsSummary.reduce((sum, d) => sum + d.amount, 0);

    const breakdown: PriceBreakdown = {
      accommodation: {
        items: accommodationItems,
        subtotal: accommodationSubtotal,
      },
      extraServices: {
        items: extraServiceItems,
        subtotal: extraServicesSubtotal,
      },
      discountsSummary,
      totalBeforeDiscounts,
      totalDiscounts,
      grandTotal: accommodationSubtotal + extraServicesSubtotal,
    };

    return {
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      numberOfNights,
      numberOfCats,
      breakdown,
      calculatedAt: new Date().toISOString(),
    };
  }

  private async calculateAccommodation(
    tenantId: string,
    checkIn: Date,
    checkOut: Date,
    numberOfNights: number,
    numberOfCats: number,
    overridesMap: Map<string, TenantPriceOverride>,
  ): Promise<PriceLineItem[]> {
    const items: PriceLineItem[] = [];

    // Recupera item soggiorno dal listino
    const accommodationItems = await this.priceListService.findActiveByCategory(
      PriceListCategory.ACCOMMODATION,
    );

    if (accommodationItems.length === 0) {
      return items;
    }

    // Per ogni giorno del soggiorno, calcola il prezzo
    // Per semplicità, usiamo il primo item di accommodation come base
    const baseItem = accommodationItems[0];

    // Calcola prezzo per notte considerando la stagionalità
    let totalPrice = 0;
    let highSeasonNights = 0;
    let lowSeasonNights = 0;

    const currentDate = new Date(checkIn);
    while (currentDate < checkOut) {
      const isHighSeason = await this.seasonalService.isHighSeason(currentDate);
      const nightPrice = this.getItemPrice(baseItem, isHighSeason, overridesMap);
      totalPrice += nightPrice * numberOfCats;

      if (isHighSeason) {
        highSeasonNights++;
      } else {
        lowSeasonNights++;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Determina il tipo di stagione prevalente
    const predominantSeason = highSeasonNights >= lowSeasonNights ? 'high' : 'low';
    const unitPrice = totalPrice / (numberOfNights * numberOfCats);

    // Applica sconti
    const applicableRules = await this.discountRulesService.getApplicableRules(
      tenantId,
      PriceListCategory.ACCOMMODATION,
      numberOfNights,
      numberOfCats,
      checkIn,
    );

    const { discounts, finalTotal } = this.applyDiscounts(
      totalPrice,
      applicableRules,
    );

    items.push({
      itemCode: baseItem.code,
      itemName: baseItem.name,
      category: baseItem.category,
      unitType: baseItem.unitType,
      unitPrice: Math.round(unitPrice * 100) / 100,
      seasonType: predominantSeason,
      quantity: numberOfNights * numberOfCats,
      subtotal: Math.round(totalPrice * 100) / 100,
      discounts,
      total: Math.round(finalTotal * 100) / 100,
    });

    return items;
  }

  private async calculateExtraServices(
    tenantId: string,
    extraServices: CalculatePriceItemDto[],
    checkIn: Date,
    numberOfNights: number,
    numberOfCats: number,
    overridesMap: Map<string, TenantPriceOverride>,
  ): Promise<PriceLineItem[]> {
    const items: PriceLineItem[] = [];
    const isHighSeason = await this.seasonalService.isHighSeason(checkIn);

    for (const service of extraServices) {
      try {
        const item = await this.priceListService.findByCode(service.itemCode);
        const unitPrice = this.getItemPrice(item, isHighSeason, overridesMap);
        const quantity = service.quantity || 1;
        const subtotal = unitPrice * quantity;

        // Applica sconti
        const applicableRules = await this.discountRulesService.getApplicableRules(
          tenantId,
          PriceListCategory.EXTRA_SERVICE,
          numberOfNights,
          numberOfCats,
          checkIn,
        );

        const { discounts, finalTotal } = this.applyDiscounts(
          subtotal,
          applicableRules,
        );

        items.push({
          itemCode: item.code,
          itemName: item.name,
          category: item.category,
          unitType: item.unitType,
          unitPrice: Math.round(unitPrice * 100) / 100,
          seasonType: isHighSeason ? 'high' : 'low',
          quantity,
          subtotal: Math.round(subtotal * 100) / 100,
          discounts,
          total: Math.round(finalTotal * 100) / 100,
        });
      } catch (error) {
        if (error instanceof NotFoundException) {
          // Ignora servizi non trovati
          continue;
        }
        throw error;
      }
    }

    return items;
  }

  private getItemPrice(
    item: PriceListItem,
    isHighSeason: boolean,
    overridesMap: Map<string, TenantPriceOverride>,
  ): number {
    const override = overridesMap.get(item.id);

    // Se esiste override, usa i prezzi dell'override (se presenti)
    if (override) {
      if (isHighSeason && override.highSeasonPrice !== null) {
        return Number(override.highSeasonPrice);
      }
      if (!isHighSeason && override.basePrice !== null) {
        return Number(override.basePrice);
      }
      // Fallback all'altro prezzo se disponibile
      if (isHighSeason && override.basePrice !== null) {
        return Number(override.basePrice);
      }
      if (!isHighSeason && override.highSeasonPrice !== null) {
        return Number(override.highSeasonPrice);
      }
    }

    // Usa prezzi globali
    if (isHighSeason && item.highSeasonPrice !== null) {
      return Number(item.highSeasonPrice);
    }
    return Number(item.basePrice);
  }

  private applyDiscounts(
    amount: number,
    rules: DiscountRule[],
  ): { discounts: AppliedDiscount[]; finalTotal: number } {
    const discounts: AppliedDiscount[] = [];
    let finalTotal = amount;
    let hasAppliedNonCumulative = false;

    for (const rule of rules) {
      // Se abbiamo già applicato uno sconto non cumulativo, salta i successivi non cumulativi
      if (!rule.isCumulative && hasAppliedNonCumulative) {
        continue;
      }

      let discountAmount: number;
      if (rule.isPercentage) {
        discountAmount = (amount * Number(rule.discountValue)) / 100;
      } else {
        discountAmount = Number(rule.discountValue);
      }

      // Non applicare sconti maggiori dell'importo rimanente
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

  private aggregateDiscounts(discounts: AppliedDiscount[]): AppliedDiscount[] {
    const aggregated = new Map<string, AppliedDiscount>();

    for (const discount of discounts) {
      const existing = aggregated.get(discount.ruleId);
      if (existing) {
        existing.amount += discount.amount;
      } else {
        aggregated.set(discount.ruleId, { ...discount });
      }
    }

    return Array.from(aggregated.values());
  }

  private calculateNights(checkIn: Date, checkOut: Date): number {
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Calcola prezzo singolo item per una data specifica
   */
  async calculateSingleItem(
    tenantId: string,
    itemCode: string,
    date: Date,
    quantity: number = 1,
  ): Promise<{
    itemCode: string;
    itemName: string;
    unitPrice: number;
    seasonType: 'high' | 'low';
    quantity: number;
    total: number;
  }> {
    const item = await this.priceListService.findByCode(itemCode);
    const overridesMap = await this.overridesService.getActiveOverridesMap(tenantId);
    const isHighSeason = await this.seasonalService.isHighSeason(date);
    const unitPrice = this.getItemPrice(item, isHighSeason, overridesMap);

    return {
      itemCode: item.code,
      itemName: item.name,
      unitPrice: Math.round(unitPrice * 100) / 100,
      seasonType: isHighSeason ? 'high' : 'low',
      quantity,
      total: Math.round(unitPrice * quantity * 100) / 100,
    };
  }
}
