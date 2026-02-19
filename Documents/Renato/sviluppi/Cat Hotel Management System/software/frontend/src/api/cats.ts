import api from '@/lib/axios';
import type { Cat, CreateCatDto, UpdateCatDto, PaginatedResponse } from '@/types';

export interface CatsQuery {
  page?: number;
  limit?: number;
  clientId?: string;
  search?: string;
  isActive?: boolean;
  isBlacklisted?: boolean;
}

export const catsApi = {
  list: (params?: CatsQuery): Promise<PaginatedResponse<Cat>> =>
    api.get('/api/v1/cats', { params }),

  byClient: (clientId: string): Promise<Cat[]> =>
    api.get(`/api/v1/cats/client/${clientId}`),

  get: (id: string): Promise<Cat> =>
    api.get(`/api/v1/cats/${id}`),

  create: (dto: CreateCatDto): Promise<Cat> =>
    api.post('/api/v1/cats', dto),

  update: (id: string, dto: UpdateCatDto): Promise<Cat> =>
    api.patch(`/api/v1/cats/${id}`, dto),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/v1/cats/${id}`),

  addToBlacklist: (id: string, reason: string): Promise<Cat> =>
    api.post(`/api/v1/cats/${id}/blacklist`, { reason }),

  removeFromBlacklist: (id: string): Promise<Cat> =>
    api.delete(`/api/v1/cats/${id}/blacklist`),
};
