import api from '@/lib/axios';
import type { User } from '@/types';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authApi = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    api.post('/api/v1/auth/login', { email, password }),

  me: (): Promise<User> =>
    api.get('/api/v1/auth/me'),

  logout: (refreshToken?: string): Promise<void> =>
    api.post('/api/v1/auth/logout', { refreshToken }),
};
