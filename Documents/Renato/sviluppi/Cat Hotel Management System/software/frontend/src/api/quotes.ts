import api from '@/lib/axios';
import type { Quote, CreateQuoteDto, UpdateQuoteDto, PaginatedResponse } from '@/types';

export interface QuotesQuery {
  page?: number;
  limit?: number;
  status?: string;
  clientId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export const quotesApi = {
  list: (params?: QuotesQuery): Promise<PaginatedResponse<Quote>> =>
    api.get('/api/v1/quotes', { params }),

  get: (id: string): Promise<Quote> =>
    api.get(`/api/v1/quotes/${id}`),

  create: (dto: CreateQuoteDto): Promise<Quote> =>
    api.post('/api/v1/quotes', dto),

  update: (id: string, dto: UpdateQuoteDto): Promise<Quote> =>
    api.patch(`/api/v1/quotes/${id}`, dto),

  delete: (id: string): Promise<void> =>
    api.delete(`/api/v1/quotes/${id}`),

  updateStatus: (id: string, status: string): Promise<Quote> =>
    api.patch(`/api/v1/quotes/${id}/status`, { status }),

  recalculate: (id: string): Promise<Quote> =>
    api.post(`/api/v1/quotes/${id}/recalculate`),

  addLineItem: (
    id: string,
    dto: {
      itemCode: string;
      quantity?: number;
      appliesToCatCount?: number;
      startDate?: string;
      endDate?: string;
      seasonType?: 'high' | 'low';
      km?: number;
      unitPrice?: number;
    },
  ): Promise<Quote> =>
    api.post(`/api/v1/quotes/${id}/line-items`, dto),

  updateLineItem: (
    id: string,
    lineId: string,
    dto: { quantity?: number; appliesToCatCount?: number },
  ): Promise<Quote> =>
    api.patch(`/api/v1/quotes/${id}/line-items/${lineId}`, dto),

  removeLineItem: (id: string, lineId: string): Promise<Quote> =>
    api.delete(`/api/v1/quotes/${id}/line-items/${lineId}`),

  generatePdf: (id: string): Promise<{ pdfPath: string }> =>
    api.post(`/api/v1/quotes/${id}/generate-pdf`),

  sendEmail: (id: string): Promise<void> =>
    api.post(`/api/v1/quotes/${id}/send-email`),
};
