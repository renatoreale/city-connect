// ─── Auth ──────────────────────────────────────────────────────────

export type RoleType = 'admin' | 'ceo' | 'titolare' | 'manager' | 'operatore';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleType;
  tenants: { id: string; name: string; role: string }[];
  currentTenantId?: string;
  isGlobalUser: boolean;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
  selectedTenantId: string | null;
}

// ─── Cliente ───────────────────────────────────────────────────────

export interface Client {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  fiscalCode?: string;
  email?: string;
  phone1: string;
  phone1Label?: string;
  phone2?: string;
  phone2Label?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  intercom?: string;
  floor?: string;
  staircase?: string;
  apartment?: string;
  mailbox?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  emergencyContactFiscalCode?: string;
  veterinarianName?: string;
  veterinarianPhone?: string;
  rating?: number;
  ratingNotes?: string;
  privacyAccepted: boolean;
  healthFormAccepted: boolean;
  rulesAccepted: boolean;
  notes?: string;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  blacklistedAt?: string | null;
  isActive: boolean;
  cats?: Cat[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientDto {
  tenantId?: string;
  firstName: string;
  lastName: string;
  fiscalCode?: string;
  email?: string;
  phone1: string;
  phone1Label?: string;
  phone2?: string;
  phone2Label?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  province?: string;
  intercom?: string;
  floor?: string;
  staircase?: string;
  apartment?: string;
  mailbox?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactEmail?: string;
  emergencyContactFiscalCode?: string;
  veterinarianName?: string;
  veterinarianPhone?: string;
  rating?: number;
  ratingNotes?: string;
  privacyAccepted?: boolean;
  healthFormAccepted?: boolean;
  rulesAccepted?: boolean;
  notes?: string;
}

export type UpdateClientDto = Partial<CreateClientDto>;

// ─── Gatto ────────────────────────────────────────────────────────

export type CatSize = 'normale' | 'grande';
export type CatGender = 'M' | 'F';

export interface Cat {
  id: string;
  tenantId: string;
  clientId: string;
  client?: { id: string; firstName: string; lastName: string };
  name: string;
  size: CatSize;
  siblingGroupId?: string | null;
  breed?: string;
  coatColor?: string;
  gender?: CatGender;
  birthDate?: string;
  weightKg?: number;
  microchipNumber?: string;
  isNeutered: boolean;
  vaccinationDate?: string;
  fivFelvTestDate?: string;
  fivFelvResult?: string;
  requiresMedication: boolean;
  medicationNotes?: string;
  dietaryNotes?: string;
  allergies?: string;
  temperament?: string;
  notes?: string;
  isBlacklisted: boolean;
  blacklistReason?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCatDto {
  tenantId?: string;
  clientId: string;
  name: string;
  size: CatSize;
  siblingGroupId?: string;
  breed?: string;
  coatColor?: string;
  gender?: CatGender;
  birthDate?: string;
  weightKg?: number;
  microchipNumber?: string;
  isNeutered?: boolean;
  vaccinationDate?: string;
  fivFelvTestDate?: string;
  fivFelvResult?: string;
  requiresMedication?: boolean;
  medicationNotes?: string;
  dietaryNotes?: string;
  allergies?: string;
  temperament?: string;
  notes?: string;
}

export type UpdateCatDto = Partial<CreateCatDto>;

// ─── Preventivi ───────────────────────────────────────────────────

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted';
export type LineItemCategory = 'accommodation' | 'extra_service';
export type LineItemSeasonType = 'high' | 'low';
export type LineItemUnitType = 'per_night' | 'per_day' | 'one_time' | 'per_hour';
export type ExtraServicePricingModel = 'standard' | 'per_km' | 'per_day_per_cat' | 'one_time_per_cat';

export interface AppliedDiscountSnapshot {
  ruleId: string;
  name: string;
  type: string;
  value: number;
  isPercentage: boolean;
  amount: number;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  priceListItemId?: string;
  itemCode: string;
  itemName: string;
  category: LineItemCategory;
  unitType: LineItemUnitType;
  pricingModel?: ExtraServicePricingModel | null;
  seasonType?: LineItemSeasonType;
  startDate?: string;
  endDate?: string;
  appliesToCatCount: number;
  unitPrice: number | string;
  quantity: number | string;
  subtotal: number | string;
  discountAmount: number | string;
  total: number | string;
  lineOrder: number;
  km?: number | null;
}

export interface TaxiConfig {
  taxiBaseKm: number;
  taxiBasePrice: number;
  taxiExtraKmPrice: number;
}

export interface QuoteCat {
  catId: string;
  quoteId: string;
  notes?: string;
  cat?: {
    id: string;
    name: string;
    size: string;
    breed?: string;
    gender?: string;
  };
}

export interface Quote {
  id: string;
  tenantId: string;
  clientId: string;
  client?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone1?: string;
  };
  quoteNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfCats: number;
  status: QuoteStatus;
  validUntil?: string;
  notes?: string;
  subtotalBeforeDiscounts: number | string;
  totalDiscounts: number | string;
  totalAmount: number | string;
  appliedDiscounts?: AppliedDiscountSnapshot[];
  pdfPath?: string;
  pdfGeneratedAt?: string;
  lineItems?: QuoteLineItem[];
  quoteCats?: QuoteCat[];
  createdAt: string;
  updatedAt: string;
}

export interface AccommodationSegmentInput {
  itemCode: string;
  startDate: string;
  endDate: string;
  seasonType: 'high' | 'low';
}

export interface CreateQuoteDto {
  clientId: string;
  catIds: string[];
  checkInDate: string;
  checkOutDate: string;
  accommodationItemCode?: string;
  accommodationSegments?: AccommodationSegmentInput[];
  extraServices?: { itemCode: string; quantity?: number; appliesToCatCount?: number; km?: number; unitPrice?: number }[];
  validUntil?: string;
  notes?: string;
}

export interface UpdateQuoteDto {
  clientId?: string;
  catIds?: string[];
  checkInDate?: string;
  checkOutDate?: string;
  validUntil?: string;
  notes?: string;
}

// ─── Listino prezzi ───────────────────────────────────────────────

export interface PriceListItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: 'accommodation' | 'extra_service';
  unitType: 'per_night' | 'per_day' | 'one_time' | 'per_hour';
  pricingModel?: ExtraServicePricingModel | null;
  basePrice: number | string;
  highSeasonPrice?: number | string | null;
  isActive: boolean;
  sortOrder: number;
}

// ─── Prenotazioni ─────────────────────────────────────────────────

export type BookingStatus =
  | 'confermata'
  | 'check_in'
  | 'in_corso'
  | 'check_out'
  | 'chiusa'
  | 'cancellata'
  | 'rimborsata'
  | 'scaduta';

export interface BookingLineItem {
  id: string;
  bookingId: string;
  priceListItemId?: string;
  itemCode: string;
  itemName: string;
  category: 'accommodation' | 'extra_service';
  unitType: 'per_night' | 'per_day' | 'one_time' | 'per_hour';
  pricingModel?: ExtraServicePricingModel | null;
  seasonType?: 'high' | 'low' | null;
  startDate?: string | null;
  endDate?: string | null;
  appliesToCatCount?: number | null;
  unitPrice: number | string;
  quantity: number;
  subtotal: number | string;
  discountAmount: number | string;
  total: number | string;
  lineOrder: number;
  addedDuringStay: boolean;
  km?: number | null;
}

export interface BookingCat {
  catId: string;
  bookingId: string;
  notes?: string;
  cat?: { id: string; name: string; size: string; breed?: string; gender?: string };
}

export interface BookingStatusHistory {
  id: string;
  bookingId: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  changedBy: string;
  changedByUser?: { id: string; firstName: string; lastName: string };
  notes?: string;
  createdAt: string;
}

export interface BookingDailyOverride {
  id: string;
  bookingId: string;
  tenantId: string;
  overrideDate: string;
  reason?: string;
  createdBy: string;
  createdByUser?: { id: string; firstName: string; lastName: string };
  createdAt: string;
}

export interface Booking {
  id: string;
  tenantId: string;
  quoteId: string;
  clientId: string;
  client?: { id: string; firstName: string; lastName: string; email?: string; phone1?: string };
  bookingNumber: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfCats: number;
  numberOfNights: number;
  subtotalBeforeDiscounts: number | string;
  totalDiscounts: number | string;
  totalAmount: number | string;
  appliedDiscounts?: AppliedDiscountSnapshot[] | null;
  status: BookingStatus;
  depositRequired: number | string;
  checkinPaymentRequired: number | string;
  checkoutPaymentRequired: number | string;
  notes?: string | null;
  lineItems?: BookingLineItem[];
  bookingCats?: BookingCat[];
  statusHistory?: BookingStatusHistory[];
  dailyOverrides?: BookingDailyOverride[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentsSummary {
  depositPaid: number;
  checkinPaid: number;
  checkoutPaid: number;
  extrasPaid: number;
  refunds: number;
  totalPaid: number;
}

export interface ConvertQuoteDto {
  quoteId: string;
  notes?: string;
}

// ─── Comuni ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
