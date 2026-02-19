// ─── Auth ──────────────────────────────────────────────────────────

export type RoleType = 'admin' | 'ceo' | 'titolare' | 'manager' | 'operatore';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleType;
  tenantIds: string[];
  tenants?: { id: string; name: string }[];
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
