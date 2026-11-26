import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserProfile, Role } from '../types';
import { apiRequest, ApiError, setStoredAuthToken } from '../lib/api';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  syncFirebaseUserProfile,
} from '../lib/firebase';
import { ensureFirebasePasswordSession } from '../lib/firebaseAuthBridge';
import { ensureFirebaseCustomSession } from '../lib/firebaseCustomToken';
import { ensureUserAccount } from '../lib/firestore/users';

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

interface StatusResponse {
  success: boolean;
  data: {
    needsSetup: boolean;
    user: UserAccount | null;
    session: SessionInfo | null;
    token?: string | null;
    settings: PublicSettings;
  };
}

const defaultSettings: PublicSettings = {
  portalName: 'TakeVault Pro',
  tagline: 'Archive your takes • Cinema Vault',
  allowPublicRegistration: true,
  logoUrl: '/favicon.svg',
  communityCommentsEnabled: true,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthContextType {
  loading: boolean;
  isAuthReady: boolean;
  /** UID de la sesión de Firebase Auth activa (null si no hay). */
  firebaseUid: string | null;
  needsSetup: boolean;
  currentUser: UserAccount | null;
  sessionInfo: SessionInfo | null;
  isGuest: boolean;
  isWorkspaceGuest: boolean;
  pendingLoginMode: 'login' | 'register';
  justLoggedOut: boolean;
  settings: PublicSettings;
  /** Motivo por el que la sesión de Firebase Auth no se pudo vincular. */
  firebaseLinkError: string | null;
  /** Vincula la sesión actual con Firebase Auth usando la contraseña de la app. */
  linkFirebaseSession: (password: string) => Promise<AuthResult>;
  login: (identifier: string, password: string, remember?: boolean) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  register: (data: { name: string; username?: string; email: string; password: string; avatar?: string }) => Promise<AuthResult>;
  setupOwner: (data: { name: string; username?: string; email: string; password: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<AuthResult>;
  updateProfile: (data: Partial<UserProfile>) => Promise<AuthResult>;
  refresh: () => Promise<void>;
  requestLogin: (mode?: 'login' | 'register', pendingAction?: string) => void;
  continueAsGuest: () => void;
  enterGuestWorkspace: () => void;
  exitToPublic: (markLoggedOut?: boolean) => void;
  clearLogoutNotice: () => void;
  clearErrorState: () => void;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [isWorkspaceGuest, setIsWorkspaceGuest] = useState(false);
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [pendingLoginMode, setPendingLoginMode] = useState<'login' | 'register'>('login');
  const [firebaseLinkError, setFirebaseLinkError] = useState<string | null>(null);

  const applyStatus = useCallback((data: StatusResponse['data']) => {
    setNeedsSetup(data.needsSetup);
    setCurrentUser(data.user);
    setSessionInfo(data.session);
    if (data.token) {
      setStoredAuthToken(data.token);
    } else if (!data.user) {
      setStoredAuthToken(null);
    }
    setSettings({ ...defaultSettings, ...data.settings });
    if (data.user) {
      setIsGuest(false);
      setIsWorkspaceGuest(false);
      setJustLoggedOut(false);
      try { sessionStorage.removeItem('screenlog_guest'); } catch {}
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await apiRequest<StatusResponse>('/api/auth/status');
      applyStatus(response.data);
    } catch {
      setStoredAuthToken(null);
      setCurrentUser(null);
      setSessionInfo(null);
      setIsGuest(true);
      try { sessionStorage.setItem('screenlog_guest', '1'); } catch {}
    }
  }, [applyStatus]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiRequest<StatusResponse>('/api/auth/status');
        if (cancelled) return;
        if (response.data.user) {
          // Sesión de Firebase automática para sesiones recordadas: el servidor
          // firma un token con el id del usuario ya autenticado. Se resuelve
          // antes de publicar el usuario para que la biblioteca no intente
          // escribir en Firestore sin credenciales.
          const custom = await ensureFirebaseCustomSession();
          if (!cancelled && !custom.ok) {
            const message = custom.message || 'No se pudo crear la sesión de Firebase.';
            setFirebaseLinkError(message);
            console.warn('Firestore sin sesión de Firebase:', message);
          }
        }
        if (cancelled) return;
        applyStatus(response.data);
      } catch {
        if (!cancelled) {
          setNeedsSetup(false);
          setCurrentUser(null);
          setStoredAuthToken(null);
          setIsGuest(true);
          try { sessionStorage.setItem('screenlog_guest', '1'); } catch {}
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [applyStatus]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUid(fbUser?.uid ?? null);
      if (fbUser) {
        if (fbUser.emailVerified) {
          try {
            await syncFirebaseUserProfile(fbUser);
          } catch (err) {
            console.error('Error syncing Firebase user profile:', err);
          }
        }
        try {
          // Entidad `users/{uid}` (cuenta privada + preferencias).
          // Se espera antes de marcar la sesión como lista para que las
          // clasificaciones no se escriban antes que su cuenta.
          await ensureUserAccount({
            uid: fbUser.uid,
            displayName: fbUser.displayName,
            email: fbUser.email,
            photoURL: fbUser.photoURL,
          });
        } catch (err) {
          console.warn('No se pudo sincronizar la cuenta en Firestore:', err);
        }
      }
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  const syncFirebaseIdentity = useCallback(
    async (
      email: string,
      password: string,
      profile?: { name?: string; avatar?: string },
    ) => {
      // 1) Vía preferida: el servidor firma un token para el usuario de la app.
      const custom = await ensureFirebaseCustomSession();
      if (!custom.ok) {
        const customMessage = custom.message || 'No se pudo crear la sesión de Firebase.';

        // 2) Respaldo: proveedor Email/Password (si está habilitado).
        try {
          const result = await ensureFirebasePasswordSession(
            email,
            password,
            profile?.name,
          );
          if (!result.ok) {
            const message = 'message' in result ? result.message : customMessage;
            setFirebaseLinkError(message);
            console.warn('Firestore sin sesión de Firebase:', message);
            return;
          }
        } catch (err) {
          setFirebaseLinkError(customMessage);
          console.warn('No se pudo sincronizar la sesión con Firebase:', err);
          return;
        }
      }

      // Con la sesión de Firebase abierta creamos el documento `users/{uid}`
      // aquí mismo. No dependemos de que `onAuthStateChanged` ya haya corrido:
      // así el usuario aparece en Firestore apenas entra.
      setFirebaseLinkError(null);
      const fbUser = auth.currentUser;
      if (fbUser?.uid) {
        try {
          await ensureUserAccount({
            uid: fbUser.uid,
            displayName: profile?.name || fbUser.displayName || fbUser.email?.split('@')[0],
            email: email || fbUser.email,
            photoURL: profile?.avatar || fbUser.photoURL,
          });
        } catch (err) {
          console.warn('No se pudo crear la cuenta en Firestore:', err);
        }
      }
    },
    [],
  );

  const linkFirebaseSession = useCallback(
    async (password: string): Promise<AuthResult> => {
      // 1) Token firmado por el servidor (no requiere contraseña).
      const custom = await ensureFirebaseCustomSession();
      if (custom.ok) {
        setFirebaseLinkError(null);
        if (auth.currentUser?.uid && currentUser?.email) {
          try {
            await ensureUserAccount({
              uid: auth.currentUser.uid,
              displayName: currentUser?.name || auth.currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser?.avatar || auth.currentUser.photoURL,
            });
          } catch (err) {
            console.warn('No se pudo crear la cuenta en Firestore:', err);
          }
        }
        return { success: true };
      }

      // 2) Respaldo con Email/Password.
      const customMessage = custom.message || 'No se pudo crear la sesión de Firebase.';
      const email = currentUser?.email?.trim();
      if (!email) {
        setFirebaseLinkError(customMessage);
        return { success: false, message: customMessage };
      }
      if (!password) {
        setFirebaseLinkError(customMessage);
        return { success: false, message: customMessage };
      }
      const result = await ensureFirebasePasswordSession(email, password, currentUser?.name);
      if (result.ok) {
        setFirebaseLinkError(null);
        if (auth.currentUser?.uid) {
          try {
            await ensureUserAccount({
              uid: auth.currentUser.uid,
              displayName: currentUser?.name || auth.currentUser.displayName,
              email,
              photoURL: currentUser?.avatar || auth.currentUser.photoURL,
            });
          } catch (err) {
            console.warn('No se pudo crear la cuenta en Firestore:', err);
          }
        }
        return { success: true };
      }
      if ('message' in result) {
        setFirebaseLinkError(result.message);
        return { success: false, message: result.message, code: result.code };
      }
      setFirebaseLinkError('No se pudo vincular la sesión de Firebase.');
      return { success: false, message: 'No se pudo vincular la sesión de Firebase.' };
    },
    [currentUser?.email, currentUser?.name],
  );

  const login = useCallback(async (identifier: string, password: string, remember = false): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo; token?: string } }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            identifier: identifier.trim(),
            email: identifier.trim(),
            username: identifier.trim(),
            password,
            remember,
          }),
        },
      );
      if (response.data.token) {
        setStoredAuthToken(response.data.token);
      }
      try {
        localStorage.setItem('sl_last_email', identifier.trim());
      } catch {
        // ignore
      }
      // Sesión de Firebase Auth para que Firestore autentique las escrituras.
      await syncFirebaseIdentity(response.data.user.email, password, {
        name: response.data.user.name,
        avatar: response.data.user.avatar,
      });
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setIsGuest(false);
      setIsWorkspaceGuest(false);
      setJustLoggedOut(false);
      setNeedsSetup(false);
      try { sessionStorage.removeItem('screenlog_guest'); } catch {}
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      return { success: false, message: 'No se pudo iniciar sesión. Inténtalo de nuevo.' };
    }
  }, []);

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const fbUser = credential.user;
      // El servidor verifica este ID token firmado; el uid/email del body
      // ya no se tienen en cuenta.
      const idToken = await fbUser.getIdToken();
      if (fbUser && fbUser.emailVerified) {
        try {
          await syncFirebaseUserProfile(fbUser);
        } catch (err) {
          console.error('Firestore profile sync warning:', err);
        }
      }
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo; token?: string } }>(
        '/api/auth/google',
        {
          method: 'POST',
          body: JSON.stringify({
            idToken,
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Cinéfilo',
            avatar: fbUser.photoURL || '',
          }),
        },
      );
      if (response.data.token) {
        setStoredAuthToken(response.data.token);
      }
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setIsGuest(false);
      setIsWorkspaceGuest(false);
      setJustLoggedOut(false);
      setNeedsSetup(false);
      try { sessionStorage.removeItem('screenlog_guest'); } catch {}
      return { success: true };
    } catch (error: any) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      if (error?.code === 'auth/popup-closed-by-user') {
        return { success: false, message: 'Cerraste la ventana de inicio de sesión con Google.' };
      }
      return { success: false, message: 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.' };
    }
  }, []);

  const register = useCallback(async (data: { name: string; username?: string; email: string; password: string; avatar?: string }): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo; token?: string } }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify(data) },
      );
      if (response.data.token) {
        setStoredAuthToken(response.data.token);
      }
      try {
        localStorage.setItem('sl_last_email', data.username || data.email);
      } catch {
        // ignore
      }
      await syncFirebaseIdentity(data.email, data.password, {
        name: data.name,
        avatar: 'avatar' in data ? data.avatar : undefined,
      });
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setIsGuest(false);
      setIsWorkspaceGuest(false);
      setJustLoggedOut(false);
      try { sessionStorage.removeItem('screenlog_guest'); } catch {}
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message, code: error.code };
      }
      return { success: false, message: 'No se pudo crear la cuenta. Inténtalo de nuevo.' };
    }
  }, []);

  const setupOwner = useCallback(async (data: { name: string; username?: string; email: string; password: string }): Promise<AuthResult> => {
    try {
      const response = await apiRequest<{ success: boolean; data: { user: UserAccount; session: SessionInfo; token?: string } }>(
        '/api/auth/setup',
        { method: 'POST', body: JSON.stringify(data) },
      );
      if (response.data.token) {
        setStoredAuthToken(response.data.token);
      }
      try {
        localStorage.setItem('sl_last_email', data.username || data.email);
      } catch {
        // ignore
      }
      await syncFirebaseIdentity(data.email, data.password, { name: data.name });
      setCurrentUser(response.data.user);
      setSessionInfo(response.data.session);
      setNeedsSetup(false);
      setIsGuest(false);
      setIsWorkspaceGuest(false);
      setJustLoggedOut(false);
      try { sessionStorage.removeItem('screenlog_guest'); } catch {}
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
    try {
      await firebaseSignOut(auth);
    } catch {}
    setStoredAuthToken(null);
    setCurrentUser(null);
    setSessionInfo(null);
    setIsGuest(true);
    setIsWorkspaceGuest(false);
    setJustLoggedOut(true);
    setFirebaseLinkError(null);
    try { sessionStorage.setItem('screenlog_guest', '1'); } catch {}
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout-all', { method: 'POST' });
    } catch {
      // local state is cleared regardless
    }
    try {
      await firebaseSignOut(auth);
    } catch {}
    setStoredAuthToken(null);
    setCurrentUser(null);
    setSessionInfo(null);
    setIsGuest(true);
    setIsWorkspaceGuest(false);
    setJustLoggedOut(true);
    setFirebaseLinkError(null);
    try { sessionStorage.setItem('screenlog_guest', '1'); } catch {}
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
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
      if (auth.currentUser && auth.currentUser.emailVerified) {
        try {
          await syncFirebaseUserProfile(auth.currentUser, response.data.user);
        } catch (err) {
          console.error('Error updating Firestore user profile:', err);
        }
      }
      return { success: true };
    } catch (error) {
      if (error instanceof ApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: 'No se pudo actualizar el perfil.' };
    }
  }, []);

  const requestLogin = useCallback((mode: 'login' | 'register' = 'login', _pendingAction?: string) => {
    setPendingLoginMode(mode);
    setIsGuest(false);
    setIsWorkspaceGuest(false);
    setJustLoggedOut(false);
  }, []);

  const continueAsGuest = useCallback(() => {
    setIsGuest(true);
    setIsWorkspaceGuest(false);
    setPendingLoginMode('login');
    try { sessionStorage.setItem('screenlog_guest', '1'); } catch {}
  }, []);

  const enterGuestWorkspace = useCallback(() => {
    setIsGuest(true);
    setIsWorkspaceGuest(true);
    setJustLoggedOut(false);
    try { sessionStorage.setItem('screenlog_guest', '1'); } catch {}
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }, []);

  const exitToPublic = useCallback((markLoggedOut = false) => {
    setIsGuest(true);
    setIsWorkspaceGuest(false);
    if (markLoggedOut) setJustLoggedOut(true);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  }, []);

  const clearLogoutNotice = useCallback(() => {
    setJustLoggedOut(false);
  }, []);

  const clearErrorState = useCallback(() => undefined, []);

  const value = useMemo<AuthContextType>(() => ({
    loading,
    isAuthReady,
    firebaseUid,
    needsSetup,
    currentUser,
    sessionInfo,
    isGuest,
    isWorkspaceGuest,
    pendingLoginMode,
    justLoggedOut,
    settings,
    firebaseLinkError,
    linkFirebaseSession,
    login,
    loginWithGoogle,
    register,
    setupOwner,
    logout,
    logoutAll,
    changePassword,
    updateProfile,
    refresh,
    requestLogin,
    continueAsGuest,
    enterGuestWorkspace,
    exitToPublic,
    clearLogoutNotice,
    clearErrorState,
  }), [
    loading,
    isAuthReady,
    firebaseUid,
    needsSetup,
    currentUser,
    sessionInfo,
    isGuest,
    isWorkspaceGuest,
    pendingLoginMode,
    justLoggedOut,
    settings,
    firebaseLinkError,
    linkFirebaseSession,
    login,
    loginWithGoogle,
    register,
    setupOwner,
    logout,
    logoutAll,
    changePassword,
    updateProfile,
    refresh,
    requestLogin,
    continueAsGuest,
    enterGuestWorkspace,
    exitToPublic,
    clearLogoutNotice,
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