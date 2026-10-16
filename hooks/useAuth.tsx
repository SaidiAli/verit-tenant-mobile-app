import { createContext, useContext, useEffect, useState, useRef, useCallback, Fragment, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { CanceledError } from 'axios';
import { AuthResponse, User } from '../types';
import { secureStorage } from '../lib/storage';
import { authApi, setUnauthorizedHandler } from '../lib/api';
import { resetSocket } from '../lib/socket';
import { isTokenExpired } from '../lib/jwt';
import { session } from '../lib/session';

interface UpdateUserRequest { firstName?: string; lastName?: string; email?: string; phone?: string }
interface ChangePasswordRequest { currentPassword: string; newPassword: string }
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userName: string, password: string) => Promise<void>;
  activate: (phone: string, tenantId: string, userName: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: UpdateUserRequest) => Promise<void>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
const ensureCurrent = (generation: number) => {
  if (!session.isCurrent(generation)) throw new CanceledError('Session changed');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState(session.current());
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();
  const storageQueue = useRef(Promise.resolve());
  const persist = useCallback((operation: () => Promise<void>) => {
    const next = storageQueue.current.catch(() => {}).then(operation);
    storageQueue.current = next;
    return next;
  }, []);
  const clearSession = useCallback(() => {
    const generation = session.reset();
    setSessionId(generation);
    setUser(null);
    resetSocket();
    void queryClient.cancelQueries();
    queryClient.clear();
    const cleared = persist(() => secureStorage.clear());
    return { generation, cleared };
  }, [persist, queryClient]);

  useEffect(() => {
    let active = true;
    const generation = session.current();
    void (async () => {
      try {
        const [token, storedUser] = await Promise.all([secureStorage.getToken(), secureStorage.getUser()]);
        if (!active || !session.isCurrent(generation)) return;
        if (token && isTokenExpired(token)) { await clearSession().cleared; return; }
        if (token && storedUser) {
          setUser(storedUser);
          try {
            const current = await authApi.getCurrentUser();
            if (!active || !session.isCurrent(generation)) return;
            await persist(async () => { if (session.isCurrent(generation)) await secureStorage.setUser(current); });
            if (active && session.isCurrent(generation)) setUser(current);
          } catch (error) {
            if (active && session.isCurrent(generation) && (error as Error).message?.includes('User not found')) await clearSession().cleared;
          }
        }
      } finally { if (active) setIsLoading(false); }
    })().catch(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [clearSession, persist]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clearSession().cleared.catch(() => {});
      router.replace('/(auth)/login');
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession, router]);

  const authenticate = async (request: () => Promise<AuthResponse>) => {
    const { generation, cleared } = clearSession();
    await cleared;
    ensureCurrent(generation);
    const response = await request();
    await persist(async () => {
      ensureCurrent(generation);
      await secureStorage.setToken(response.token);
      ensureCurrent(generation);
      await secureStorage.setUser(response.user);
    });
    ensureCurrent(generation);
    setUser(response.user);
    router.replace('/(tabs)');
  };
  const logout = async () => {
    const { generation, cleared } = clearSession();
    await cleared;
    if (session.isCurrent(generation)) router.replace('/(auth)/login');
  };
  const refreshUser = async () => {
    const generation = session.current();
    const current = await authApi.getCurrentUser();
    await persist(async () => { ensureCurrent(generation); await secureStorage.setUser(current); });
    ensureCurrent(generation);
    setUser(current);
  };
  const updateUser = async (data: UpdateUserRequest) => {
    const generation = session.current();
    const updated = await authApi.updateUser(data);
    await persist(async () => { ensureCurrent(generation); await secureStorage.setUser(updated); });
    ensureCurrent(generation);
    setUser(updated);
  };
  const value: AuthContextType = {
    user, isLoading, isAuthenticated: !!user,
    login: (username, password) => authenticate(() => authApi.login({ username, password })),
    activate: (phone, tenantId, userName, password) => authenticate(() => authApi.activateTenant({ phone, tenantId, userName, password })),
    logout, refreshUser, updateUser,
    changePassword: data => authApi.changePassword(data),
  };
  return <AuthContext.Provider value={value}><Fragment key={user ? `${user.id}:${sessionId}` : 'signed-out'}>{children}</Fragment></AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
