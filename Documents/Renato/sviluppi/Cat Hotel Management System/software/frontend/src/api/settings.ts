import api from '@/lib/axios';
import type { TaxiConfig } from '@/types';

export const settingsApi = {
  getTaxiConfig: (): Promise<TaxiConfig> =>
    api.get('/api/v1/tenant-settings/taxi'),
};
