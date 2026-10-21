import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserProfile, Role } from '../types';
import { apiRequest, ApiError } from '../lib/api';

export type { Role };

export interface UserAccount extends UserProfile {
  role: Role;
  blocked: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SessionInfo {
  id: string;
  browser: string;
  os: string;
  ip: string;
  startedAt: string;
  lastActivityAt: string;
}

export interface SystemLog {
  id: string;
  level: 'info' | 'warning' | 'error' | 'security';
  category: 'auth' | 'security' | 'moderation' | 'admin' | 'billing' | 'infrastructure';
  message: string;
  actorId?: string;
  actorName?: string;
  target?: string;
  ip?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  targetType: string;
  targetId?: string;
  targetName?: string;
  result: 'success' | 'failure';
  details?: string;
  createdAt: string;
}

export interface PublicSettings {
  portalName: string;
  tagline: string;
  allowPublicRegistration: boolean;
  logoUrl?: string;
  communityCommentsEnabled?: boolean;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Administrador',
  user: 'Usuario',
};

export const isStaff = (role?: Role | null): boolean => role === 'owner' || role === 'admin';
export const isOwner = (role?: Role | null): boolean => role === 'owner';
export const canEditCatalog = isStaff;
export const canModerate = isStaff;
export const canManageUsers = isStaff;
export const canEditSettings = isStaff;
export const canViewModerationHistory = isStaff;
export const canViewSystemLogs = isOwner;
export const canManageBilling = isOwner;
export const canManageCredentials = isOwner;
export const canManageAdmins = isOwner;
export const canTransferOwnership = isOwner;
export const canViewOtherSessions = (_role?: Role | null): boolean => false;

interface AuthResult {
  success: boolean;
  message?: string;
  code?: string;
}

interface AuthContextType {
  loading: boolean;
  needsSetup: boolean;
  currentUser: UserAccount | null;
  sessionInfo: SessionInfo | null;
  isGuest: boolean;
  settings: PublicSettings;
  login: (email: string, password: string, remember?: boolean) => Promise<AuthResult>;
  register: (data: { name: string; email: string; password: string; avatar?: string }) => Promise<AuthResult>;
  setupOwner: (data: { name: string; email: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  updateProfile: (data: Partial<UserProfile>) => Promise<AuthResult>;
  refresh: () => Promise<void>;
  requestLogin: () => void;
  continueAsGuest: () => void;
  clearErrorState: () => void;
}

const defaultSettings: PublicSettings = {
  portalName: 'ScreenLog Pro',
  tagline: 'Explora, clasifica y comparte tu pasión por el cine',
  allowPublicRegistration: true,
  logoUrl: '/favicon.svg',
  communityCommentsEnabled: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface StatusResponse {
  success: boolean;
  data: {
    needsSetup: boolean;
    user: UserAccount | null;
    session: SessionInfo | null;
    settings: PublicSettings;
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);

  const applyStatus = useCallback((data: StatusResponse['data']) => {
    setNeedsSetup(data.needsSetup);
    setCurrentUser(data.user);
    setSessionInfo(data.session);
    setSettings({ ...defaultSettings, ...data.settings });
    if (data.user) setIsGuest(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest<StatusResponse>('/api/auth/status');
      applyStatus(response.data);
    } catch {
      setCurrentUser(null);
      setSessionInfo(null);
    }
  }, [applyStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiRequest<StatusResponse>('/api/auth/status');
        if (!cancelled) applyStatus(response.data);
      } catch {
        if (!cancelled) {
          setNeedsSetup(false);
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  const login = useCallback(async (email: string, password: string, remember = false): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo } }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password, remember }) },
      );
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setIsGuest(false);
      setNeedsSetup(false);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      return { success: false, message: 'No se pudo iniciar sesión. Inténtalo de nuevo.' };
    }
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; avatar?: string }): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo } }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(data) },
      );
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setIsGuest(false);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      return { success: false, message: 'No se pudo crear la cuenta. Inténtalo de nuevo.' };
    }
  }, []);

  const setupOwner = useCallback(async (data: { name: string; email: string; password: string }): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo } }>(
        '/api/auth/setup',
        { method: 'POST', body: JSON.stringify(data) },
      );
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setNeedsSetup(false);
      setIsGuest(false);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      return { success: false, message: 'No se pudo completar la configuración inicial.' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // local state is cleared regardless
    }
    setCurrentUser(null);
    setSessionInfo(null);
    setIsGuest(false);
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout-all', { method: 'POST' });
    } catch {
      // local state is cleared regardless
    }
    setCurrentUser(null);
    setSessionInfo(null);
    setIsGuest(false);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<AuthResult> => {
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      return { success: false, message: 'No se pudo cambiar la contraseña.' };
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<UserProfile>): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount } }>('/api/me/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      setCurrentUser(response.data.user);
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'No se pudo actualizar el perfil.' };
    }
  }, []);

  const requestLogin = useCallback(() => {
    setIsGuest(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
  }, []);

  const clearErrorState = useCallback(() => undefined, []);

  const value = useMemo<AuthContextType>(() => ({
    loading,
    needsSetup,
    currentUser,
    sessionInfo,
    isGuest,
    settings,
    login,
    register,
    setupOwner,
    logout,
    logoutAll,
    changePassword,
    updateProfile,
    refresh,
    requestLogin,
    continueAsGuest,
    clearErrorState,
  }), [
    loading,
    needsSetup,
    currentUser,
    sessionInfo,
    isGuest,
    settings,
    login,
    register,
    setupOwner,
    logout,
    logoutAll,
    changePassword,
    updateProfile,
    refresh,
    requestLogin,
    continueAsGuest,
    clearErrorState,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
