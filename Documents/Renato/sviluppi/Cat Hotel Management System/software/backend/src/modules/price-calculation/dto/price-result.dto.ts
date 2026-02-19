export interface AppliedDiscount {
  ruleId: string;
  name: string;
  type: string;
  value: number;
  isPercentage: boolean;
  amount: number;
}

export interface PriceLineItem {
  itemCode: string;
  itemName: string;
  category: string;
  unitType: string;
  unitPrice: number;
  seasonType: 'high' | 'low';
  quantity: number;
  subtotal: number;
  discounts: AppliedDiscount[];
  total: number;
}

export interface PriceBreakdown {
  accommodation: {
    items: PriceLineItem[];
    subtotal: number;
  };
  extraServices: {
    items: PriceLineItem[];
    subtotal: number;
  };
  discountsSummary: AppliedDiscount[];
  totalBeforeDiscounts: number;
  totalDiscounts: number;
  grandTotal: number;
}

export interface PriceCalculationResult {
  checkInDate: string;
  checkOutDate: string;
  numberOfNights: number;
  numberOfCats: number;
  breakdown: PriceBreakdown;
  calculatedAt: string;
}
