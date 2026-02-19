import React, { createContext, useContext, useState, useCallback } from 'react';
import type { User } from '@/types';
import type { LoginResponse } from '@/api/auth';

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  selectedTenantId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (response: LoginResponse) => void;
  selectTenant: (tenantId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [accessToken, setAccessToken] = useState<string | null>(
    () => localStorage.getItem('accessToken'),
  );

  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(
    () => localStorage.getItem('selectedTenantId'),
  );

  const login = useCallback(({ accessToken: token, refreshToken, user: userData }: LoginResponse) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser(userData);
    setAccessToken(token);

    // Selezione automatica tenant se ce n'è solo uno
    const tenantIds = userData.tenantIds ?? [];
    if (tenantIds.length === 1) {
      const tid = tenantIds[0];
      localStorage.setItem('selectedTenantId', tid);
      setSelectedTenantId(tid);
    }
  }, []);

  const selectTenant = useCallback((tenantId: string) => {
    localStorage.setItem('selectedTenantId', tenantId);
    setSelectedTenantId(tenantId);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedTenantId');
    setUser(null);
    setAccessToken(null);
    setSelectedTenantId(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        selectedTenantId,
        isLoading: false,
        isAuthenticated: !!accessToken && !!user,
        login,
        selectTenant,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
