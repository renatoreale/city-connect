import api from '@/lib/axios';
import type { PriceListItem, ExtraServicePricingModel } from '@/types';

interface PriceListQuery {
  category?: 'accommodation' | 'extra_service';
  isActive?: boolean;
}

export interface PriceListCreateDto {
  code: string;
  name: string;
  description?: string;
  category: 'accommodation' | 'extra_service';
  unitType: 'per_night' | 'per_day' | 'one_time' | 'per_hour';
  pricingModel?: ExtraServicePricingModel | null;
  basePrice: number;
  highSeasonPrice?: number | null;
  isActive?: boolean;
  sortOrder?: number;
}

export const priceListApi = {
  list: (params?: PriceListQuery): Promise<{ data: PriceListItem[]; total: number }> =>
    api.get('/api/v1/price-list', { params }),

  create: (data: PriceListCreateDto): Promise<PriceListItem> =>
    api.post('/api/v1/price-list', data),

  update: (id: string, data: Partial<PriceListCreateDto>): Promise<PriceListItem> =>
    api.patch(`/api/v1/price-list/${id}`, data),

  remove: (id: string): Promise<void> =>
    api.delete(`/api/v1/price-list/${id}`),
};
