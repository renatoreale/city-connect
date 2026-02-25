import api from '@/lib/axios';
import type { TaxiConfig, TenantSettings } from '@/types';

export const settingsApi = {
  getTaxiConfig: (): Promise<TaxiConfig> =>
    api.get('/api/v1/tenant-settings/taxi'),

  getAll: (): Promise<TenantSettings> =>
    api.get('/api/v1/tenant-settings'),

  update: (data: Partial<TenantSettings>): Promise<TenantSettings> =>
    api.patch('/api/v1/tenant-settings', data),
};
