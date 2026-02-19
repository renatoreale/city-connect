import api from '@/lib/axios';
import type { Client, CreateClientDto, UpdateClientDto, PaginatedResponse } from '@/types';

export interface ClientsQuery {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  isBlacklisted?: boolean;
}

export const clientsApi = {
  list: (params?: ClientsQuery): Promise<PaginatedResponse<Client>> =>
    api.get('/api/v1/clients', { params }),

  get: (id: string): Promise<Client> =>
    api.get(`/api/v1/clients/${id}`),

  create: (dto: CreateClientDto): Promise<Client> =>
    api.post('/api/v1/clients', dto),

  update: (id: string, dto: UpdateClientDto): Promise<Client> =>
    api.patch(`/api/v1/clients/${id}`, dto),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/v1/clients/${id}`),

  addToBlacklist: (id: string, reason?: string): Promise<Client> =>
    api.post(`/api/v1/clients/${id}/blacklist`, { reason }),

  removeFromBlacklist: (id: string): Promise<Client> =>
    api.delete(`/api/v1/clients/${id}/blacklist`),
};
