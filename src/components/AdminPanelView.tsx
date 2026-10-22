import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Ban,
  BarChart3,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Crown,
  Database,
  Eye,
  EyeOff,
  FileClock,
  History,
  KeyRound,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  Search,
  ServerCog,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCog,
  UserPlus,
  UserX,
  Users,
  Wallet,
  X,
  Film,
  Plus,
  Edit3,
} from 'lucide-react';
import {
  AuditLog,
  ROLE_LABELS,
  SystemLog,
  UserAccount,
  canManageAdmins,
  canManageBilling,
  canManageCredentials,
  canManageUsers,
  canModerate,
  canTransferOwnership,
  canViewModerationHistory,
  canViewSystemLogs,
  isOwner,
  useAuth,
} from '../context/AuthContext';
import { useMedia } from '../context/MediaContext';
import type { MediaItem, MediaType } from '../types';
import { apiRequest, ApiError, formatDate } from '../lib/api';

type AdminTab =
  | 'summary'
  | 'catalog'
  | 'users'
  | 'moderation'
  | 'settings'
  | 'history'
  | 'billing'
  | 'credentials'
  | 'logs'
  | 'admins'
  | 'transfer';

interface AdminUser extends UserAccount {
  sessionsCount: number;
}

interface ModerationItem {
  id: string;
  type: 'comment' | 'review';
  mediaId: string;
  userId: string;
  author: string;
  avatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
  hidden: boolean;
  deleted: boolean;
  moderatedBy?: string | null;
  moderationReason?: string | null;
}

interface AdminSettings {
  portalName: string;
  tagline: string;
  logoUrl?: string;
  allowPublicRegistration: boolean;
  communityCommentsEnabled: boolean;
  catalogPerPage?: number;
  updatedAt?: string;
}

interface BillingState {
  planName: string;
  planStatus: string;
  stripePublishableKey: string;
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  updatedAt?: string;
}

interface CredentialStatus {
  [key: string]: { configured: boolean; masked: string };
}

interface TransferResponse {
  success: boolean;
  data: { user: UserAccount; newOwner: UserAccount };
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
}

const inputClass =
  'w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/40 focus:outline-none transition-colors';

const cardClass = 'rounded-3xl bg-[#141416] border border-white/10';

const RolePill: React.FC<{ role: UserAccount['role'] }> = ({ role }) => {
  const styles =
    role === 'owner'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : role === 'admin'
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : 'bg-sky-500/10 text-sky-300 border-sky-500/25';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles}`}>
      {role === 'owner' ? <Crown className="w-3 h-3" /> : role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
      {ROLE_LABELS[role]}
    </span>
  );
};

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  pelicula: 'Película',
  serie: 'Serie',
  anime: 'Anime',
  documental: 'Documental',
};

const MEDIA_TYPE_STYLES: Record<MediaType, string> = {
  pelicula: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  serie: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  anime: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  documental: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: string | number; tone?: string }> = ({
  icon: Icon,
  label,
  value,
  tone = 'text-rose-400',
}) => (
  <div className={`${cardClass} p-4 sm:p-5`}>
    <div className="flex items-center justify-between">
      <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-slate-500">{label}</span>
      <Icon className={`w-4 h-4 ${tone}`} />
    </div>
    <p className="font-display text-2xl sm:text-3xl font-black text-white mt-2">{value}</p>
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="py-12 text-center text-sm text-slate-500">{message}</div>
);

export const AdminPanelView: React.FC = () => {
  const { currentUser, refresh, requestLogin } = useAuth();
  const {
    mediaList,
    openEditMediaModal,
    deleteMediaItem,
    setIsAddModalOpen,
    setSelectedMediaId,
  } = useMedia();

  const [activeTab, setActiveTab] = useState<AdminTab>('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [moderation, setModeration] = useState<ModerationItem[]>([]);
  const [history, setHistory] = useState<AuditLog[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [credentials, setCredentials] = useState<CredentialStatus>({});

  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState<'all' | MediaType>('all');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserAccount['role']>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [moderationType, setModerationType] = useState<'all' | 'comment' | 'review'>('all');
  const [moderationStatus, setModerationStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [tempPassword, setTempPassword] = useState<{ name: string; email: string; password: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedUserForModal, setSelectedUserForModal] = useState<AdminUser | null>(null);

  const [settingsForm, setSettingsForm] = useState<AdminSettings | null>(null);
  const [billingForm, setBillingForm] = useState({ planName: '', planStatus: '', stripePublishableKey: '' });
  const [credentialForm, setCredentialForm] = useState<Record<string, string>>({});
  const [logCategory, setLogCategory] = useState('all');
  const [logLevel, setLogLevel] = useState('all');

  const [promoteEmail, setPromoteEmail] = useState('');
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
  const [transferForm, setTransferForm] = useState({ email: '', password: '', confirmation: '', doubleConfirm: false });
  const [showTransferPassword, setShowTransferPassword] = useState(false);

  const isOwnerUser = isOwner(currentUser?.role);
  const tabs = useMemo(() => {
    const base: { id: AdminTab; label: string; icon: React.ElementType }[] = [
      { id: 'summary', label: 'Resumen', icon: BarChart3 },
      { id: 'catalog', label: 'Catálogo', icon: Film },
      { id: 'users', label: 'Usuarios', icon: Users },
      { id: 'moderation', label: 'Moderación', icon: ShieldAlert },
      { id: 'settings', label: 'Ajustes', icon: Settings },
      { id: 'history', label: 'Historial', icon: History },
    ];
    if (isOwnerUser) {
      base.push(
        { id: 'billing', label: 'Facturación', icon: CreditCard },
        { id: 'credentials', label: 'Credenciales', icon: KeyRound },
        { id: 'logs', label: 'Registros', icon: FileClock },
        { id: 'admins', label: 'Admins', icon: UserCog },
        { id: 'transfer', label: 'Transferir', icon: Crown },
      );
    }
    return base;
  }, [isOwnerUser]);

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4500);
  };

  const handleError = (requestError: unknown) => {
    setError(requestError instanceof ApiError ? requestError.message : 'No se pudo completar la operación.');
  };

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, moderationResponse, historyResponse] = await Promise.all([
        apiRequest<{ success: boolean; data: AdminUser[] }>('/api/admin/users'),
        apiRequest<{ success: boolean; data: ModerationItem[] }>('/api/admin/moderation'),
        apiRequest<{ success: boolean; data: AuditLog[] }>('/api/admin/history'),
      ]);
      setUsers(usersResponse.data || []);
      setModeration(moderationResponse.data || []);
      setHistory(historyResponse.data || []);
    } catch (requestError) {
      handleError(requestError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  useEffect(() => {
    if (!activeTab) return;
    let cancelled = false;
    (async () => {
      try {
        if (activeTab === 'settings') {
          const response = await apiRequest<{ success: boolean; data: AdminSettings }>('/api/admin/settings');
          if (!cancelled) {
            setSettings(response.data);
            setSettingsForm(response.data);
          }
        }
        if (activeTab === 'billing') {
          const response = await apiRequest<{ success: boolean; data: BillingState }>('/api/owner/billing');
          if (!cancelled) {
            setBilling(response.data);
            setBillingForm({
              planName: response.data.planName || '',
              planStatus: response.data.planStatus || '',
              stripePublishableKey: '',
            });
          }
        }
        if (activeTab === 'credentials') {
          const response = await apiRequest<{ success: boolean; data: CredentialStatus }>('/api/owner/credentials');
          if (!cancelled) setCredentials(response.data || {});
        }
        if (activeTab === 'logs') {
          const params = new URLSearchParams();
          if (logCategory !== 'all') params.set('category', logCategory);
          if (logLevel !== 'all') params.set('level', logLevel);
          const response = await apiRequest<{ success: boolean; data: SystemLog[] }>(
            `/api/owner/logs${params.toString() ? `?${params.toString()}` : ''}`,
          );
          if (!cancelled) setLogs(response.data || []);
        }
        if (activeTab === 'admins') {
          const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
          if (!cancelled) setAdmins(response.data || []);
        }
      } catch (requestError) {
        if (!cancelled) handleError(requestError);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, logCategory, logLevel]);

  if (!currentUser || !(currentUser.role === 'owner' || currentUser.role === 'admin')) {
    return (
      <div className="py-16 text-center">
        <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
        <p className="text-sm text-slate-400">No tienes permisos para acceder al panel de administración.</p>
      </div>
    );
  }

  const canManageTarget = (target: AdminUser): boolean => {
    if (target.role === 'owner') return false;
    if (target.id === currentUser.id) return false;
    if (currentUser.role === 'owner') return true;
    return currentUser.role === 'admin' && target.role === 'user';
  };

  const filteredUsers = users.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    if (search && !`${user.name} ${user.email}`.toLowerCase().includes(search)) return false;
    if (userRoleFilter !== 'all' && user.role !== userRoleFilter) return false;
    if (userStatusFilter === 'active' && user.blocked) return false;
    if (userStatusFilter === 'blocked' && !user.blocked) return false;
    return true;
  });

  const filteredModeration = moderation.filter((item) => {
    if (moderationType !== 'all' && item.type !== moderationType) return false;
    if (moderationStatus === 'visible' && item.hidden) return false;
    if (moderationStatus === 'hidden' && !item.hidden) return false;
    return true;
  });

  const filteredCatalog = useMemo(() => {
    return mediaList.filter((item) => {
      if (catalogTypeFilter !== 'all' && item.type !== catalogTypeFilter) return false;
      if (!catalogSearch.trim()) return true;
      const q = catalogSearch.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        (item.originalTitle && item.originalTitle.toLowerCase().includes(q)) ||
        (item.director && item.director.toLowerCase().includes(q)) ||
        item.genres.some((g) => g.toLowerCase().includes(q))
      );
    });
  }, [mediaList, catalogSearch, catalogTypeFilter]);

  const triggerDeleteMedia = (media: MediaItem) => {
    const typeLabel = MEDIA_TYPE_LABELS[media.type] || 'título';
    setConfirmDialog({
      title: `¿Eliminar "${media.title}" del catálogo?`,
      description: `Esta acción quitará de forma permanente este título (${typeLabel}, ${media.year}) del catálogo de ScreenLog y registrará la acción en la auditoría.`,
      confirmLabel: 'Quitar del catálogo',
      danger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await deleteMediaItem(media.id);
          if (res.success) {
            flash(`"${media.title}" eliminada del catálogo.`);
            setConfirmDialog(null);
            void loadCore();
          } else {
            setError(res.message || 'No se pudo eliminar el elemento del catálogo.');
          }
        } catch (requestError) {
          handleError(requestError);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const summary = {
    totalUsers: users.length,
    blockedUsers: users.filter((user) => user.blocked).length,
    staff: users.filter((user) => user.role !== 'user').length,
    pendingPassword: users.filter((user) => user.mustChangePassword).length,
    comments: moderation.filter((item) => item.type === 'comment' && !item.deleted).length,
    reviews: moderation.filter((item) => item.type === 'review').length,
    hidden: moderation.filter((item) => item.hidden).length,
  };

  const executeUserAction = async (
    user: AdminUser,
    action: 'block' | 'unblock' | 'reset-password' | 'force-logout',
  ) => {
    setActionLoading(true);
    try {
      const response = await apiRequest<{ success: boolean; data: AdminUser & { temporaryPassword?: string } }>(
        `/api/admin/users/${encodeURIComponent(user.id)}/${action}`,
        { method: 'POST' },
      );
      await loadCore();
      setConfirmDialog(null);

      // Keep user in modal in sync if open
      if (response.data) {
        setSelectedUserForModal((prev) => (prev?.id === user.id ? { ...prev, ...response.data } : prev));
      }

      if (action === 'reset-password' && response.data?.temporaryPassword) {
        setTempPassword({ name: user.name, email: user.email, password: response.data.temporaryPassword });
        setNotice('Contraseña temporal generada con éxito. Se muestra a continuación.');
      } else {
        flash('Acción completada correctamente.');
      }
    } catch (requestError) {
      handleError(requestError);
    } finally {
      setActionLoading(false);
    }
  };

  const triggerUserAction = (
    user: AdminUser,
    action: 'block' | 'unblock' | 'reset-password' | 'force-logout',
  ) => {
    const titles: Record<typeof action, string> = {
      block: `¿Bloquear a ${user.name}?`,
      unblock: `¿Desbloquear a ${user.name}?`,
      'reset-password': `¿Restablecer contraseña de ${user.name}?`,
      'force-logout': `¿Cerrar todas las sesiones de ${user.name}?`,
    };
    const descriptions: Record<typeof action, string> = {
      block: `Se revocarán los accesos y se cerrarán inmediatamente sus ${user.sessionsCount} sesiones activas.`,
      unblock: `El usuario podrá volver a acceder a ScreenLog Pro normalmente.`,
      'reset-password': `Se generará una contraseña temporal de un solo uso y se cerrarán todas sus sesiones. La clave se mostrará en pantalla para que puedas copiarla.`,
      'force-logout': `Se cerrarán sus ${user.sessionsCount} sesiones en todos sus navegadores y dispositivos. Deberá iniciar sesión de nuevo.`,
    };
    const labels: Record<typeof action, string> = {
      block: 'Bloquear usuario',
      unblock: 'Desbloquear usuario',
      'reset-password': 'Generar contraseña temporal',
      'force-logout': 'Cerrar sesiones activas',
    };

    setConfirmDialog({
      title: titles[action],
      description: descriptions[action],
      confirmLabel: labels[action],
      danger: action !== 'unblock',
      onConfirm: async () => {
        await executeUserAction(user, action);
      },
    });
  };

  const runUserAction = triggerUserAction;

  const executeModeration = async (item: ModerationItem, action: 'hide' | 'unhide' | 'delete') => {
    setActionLoading(true);
    try {
      if (action === 'delete') {
        await apiRequest(`/api/admin/moderation/${encodeURIComponent(item.id)}?type=${item.type}`, {
          method: 'DELETE',
        });
      } else {
        await apiRequest(`/api/admin/moderation/${encodeURIComponent(item.id)}/${action}`, {
          method: 'POST',
          body: JSON.stringify({ type: item.type }),
        });
      }
      await loadCore();
      flash('Moderación aplicada.');
      setConfirmDialog(null);
    } catch (requestError) {
      handleError(requestError);
    } finally {
      setActionLoading(false);
    }
  };

  const triggerModeration = (item: ModerationItem, action: 'hide' | 'unhide' | 'delete') => {
    if (action === 'unhide') {
      void executeModeration(item, 'unhide');
      return;
    }
    setConfirmDialog({
      title: action === 'hide' ? '¿Ocultar publicación?' : '¿Eliminar publicación?',
      description: action === 'hide'
        ? 'La publicación dejará de verse en la comunidad pero permanecerá en los registros.'
        : 'Esta acción es permanente y eliminará el comentario o reseña de la base de datos.',
      confirmLabel: action === 'hide' ? 'Ocultar' : 'Eliminar definitivamente',
      danger: action === 'delete',
      onConfirm: async () => {
        await executeModeration(item, action);
      },
    });
  };

  const runModeration = triggerModeration;

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!settingsForm) return;
    try {
      const response = await apiRequest<{ success: boolean; data: AdminSettings }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsForm),
      });
      setSettings(response.data);
      setSettingsForm(response.data);
      flash('Configuración guardada.');
      await refresh();
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const saveBilling = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload: Record<string, string> = {
        planName: billingForm.planName,
        planStatus: billingForm.planStatus,
      };
      if (billingForm.stripePublishableKey.trim()) {
        payload.stripePublishableKey = billingForm.stripePublishableKey.trim();
      }
      const response = await apiRequest<{ success: boolean; data: BillingState }>('/api/owner/billing', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setBilling({ ...response.data, stripeConfigured: billing?.stripeConfigured || false, webhookConfigured: billing?.webhookConfigured || false });
      setBillingForm((prev) => ({ ...prev, stripePublishableKey: '' }));
      flash('Facturación actualizada.');
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const saveCredentials = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload: Record<string, string> = {};
    Object.entries(credentialForm).forEach(([key, value]) => {
      const text = String(value).trim();
      if (text) payload[key] = text;
    });
    if (Object.keys(payload).length === 0) {
      setError('Escribe al menos un valor para guardar.');
      return;
    }
    try {
      await apiRequest('/api/owner/credentials', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setCredentialForm({});
      const response = await apiRequest<{ success: boolean; data: CredentialStatus }>('/api/owner/credentials');
      setCredentials(response.data || {});
      flash('Credenciales guardadas cifradas.');
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const testCredential = async (provider: 'stripe' | 'smtp') => {
    try {
      const response = await apiRequest<{ success: boolean; data: { ok: boolean; message: string } }>(
        '/api/owner/credentials/test',
        { method: 'POST', body: JSON.stringify({ provider }) },
      );
      flash(response.data.message);
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const promoteAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!promoteEmail.trim()) return;
    try {
      await apiRequest('/api/owner/admins', {
        method: 'POST',
        body: JSON.stringify({ mode: 'promote', email: promoteEmail.trim() }),
      });
      setPromoteEmail('');
      const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
      setAdmins(response.data || []);
      flash('Usuario promovido a administrador.');
      await loadCore();
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const createAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await apiRequest('/api/owner/admins', {
        method: 'POST',
        body: JSON.stringify({ mode: 'create', ...newAdmin }),
      });
      setNewAdmin({ name: '', email: '', password: '' });
      const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
      setAdmins(response.data || []);
      flash('Cuenta de administrador creada.');
      await loadCore();
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const triggerRevokeAdmin = (admin: AdminUser) => {
    setConfirmDialog({
      title: `¿Revocar rol de administrador a ${admin.name}?`,
      description: 'El usuario pasará a ser un usuario estándar sin privilegios de moderación ni administración.',
      confirmLabel: 'Revocar rol de administrador',
      danger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await apiRequest(`/api/owner/admins/${encodeURIComponent(admin.id)}`, { method: 'DELETE' });
          const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
          setAdmins(response.data || []);
          flash('Rol de administrador revocado.');
          await loadCore();
          setConfirmDialog(null);
        } catch (requestError) {
          handleError(requestError);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const revokeAdmin = triggerRevokeAdmin;

  const transferOwnership = (event: React.FormEvent) => {
    event.preventDefault();
    setConfirmDialog({
      title: '¿Confirmar transferencia de propiedad?',
      description: `Esta acción transferirá la titularidad del portal de forma permanente e irreversible a ${transferForm.email}. Tu cuenta pasará a ser Administrador.`,
      confirmLabel: 'Transferir propiedad ahora',
      danger: true,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await apiRequest<TransferResponse>('/api/owner/transfer-ownership', {
            method: 'POST',
            body: JSON.stringify(transferForm),
          });
          setTransferForm({ email: '', password: '', confirmation: '', doubleConfirm: false });
          flash('Propiedad transferida con éxito. Tu rol ahora es Administrador.');
          setConfirmDialog(null);
          await refresh();
          await loadCore();
        } catch (requestError) {
          handleError(requestError);
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const copyTempPassword = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword.password);
      flash('Contraseña temporal copiada.');
    } catch {
      setError('No se pudo copiar automáticamente. Selecciona el texto manualmente.');
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] font-bold text-rose-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            Control del portal
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight mt-2">Panel de administración</h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Gestiona usuarios, modera la comunidad y supervisa la seguridad de ScreenLog Pro.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <RolePill role={currentUser.role} />
          <button
            type="button"
            onClick={() => void loadCore()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p>{error}</p>
            {error.includes('iniciar sesión') && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={requestLogin}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] transition-colors shadow-sm"
                >
                  <Lock className="w-3 h-3" />
                  Iniciar sesión ahora
                </button>
                <span className="text-[11px] text-rose-300/80">
                  Para restaurar el token de autenticación permanente.
                </span>
              </div>
            )}
          </div>
          <button type="button" onClick={() => setError('')} aria-label="Cerrar error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setError('');
              setActiveTab(tab.id);
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors ${
              activeTab === tab.id
                ? 'bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-900/30'
                : 'bg-white/[0.03] text-slate-400 border-white/10 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard icon={Film} label="Catálogo" value={mediaList.length} tone="text-emerald-400" />
            <StatCard icon={Users} label="Usuarios" value={summary.totalUsers} />
            <StatCard icon={UserX} label="Bloqueados" value={summary.blockedUsers} tone="text-amber-400" />
            <StatCard icon={MessageSquare} label="Comentarios" value={summary.comments} tone="text-sky-400" />
            <StatCard icon={ShieldAlert} label="Ocultos" value={summary.hidden} tone="text-rose-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <section className={`${cardClass} p-5 lg:col-span-2`}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-rose-400" />
                <h2 className="font-display text-lg font-black tracking-tight">Actividad reciente</h2>
              </div>
              <div className="space-y-2.5">
                {history.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div className="w-7 h-7 rounded-lg bg-rose-600/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                      <History className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-300">
                        <strong className="text-white">{entry.actorName}</strong> · {entry.action}
                        {entry.targetName ? ` · ${entry.targetName}` : ''}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{formatDate(entry.createdAt)}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 shrink-0">{entry.result}</span>
                  </div>
                ))}
                {history.length === 0 && <EmptyState message="Todavía no hay actividad registrada." />}
              </div>
            </section>

            <section className={`${cardClass} p-5 space-y-4`}>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                <h2 className="font-display text-lg font-black tracking-tight">Estado del portal</h2>
              </div>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Títulos en catálogo</span>
                  <span className="text-slate-200 font-bold">{mediaList.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Películas</span>
                  <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'movie').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Series</span>
                  <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'tv').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Administradores</span>
                  <span className="text-slate-200 font-bold">{users.filter((user) => user.role === 'admin').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Owner</span>
                  <span className="text-slate-200 font-bold">{users.filter((user) => user.role === 'owner').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reseñas comunitarias</span>
                  <span className="text-slate-200 font-bold">{summary.reviews}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-white/5">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Los administradores y el owner tienen permisos completos CRUD sobre el catálogo (añadir por TMDB o manual, editar ficha técnica y quitar títulos).
                </p>
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-white/5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-black tracking-tight text-white">
                  Gestión de catálogo
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300">
                  {filteredCatalog.length} de {mediaList.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Añade nuevos títulos, edita cualquier ficha técnica o retira películas y series del catálogo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Añadir nuevo título
            </button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Buscar por título, director o género..."
                className={`${inputClass} pl-9`}
                aria-label="Buscar en catálogo"
              />
              {catalogSearch && (
                <button
                  type="button"
                  onClick={() => setCatalogSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <select
              value={catalogTypeFilter}
              onChange={(event) => setCatalogTypeFilter(event.target.value as typeof catalogTypeFilter)}
              className={`${inputClass} md:w-48`}
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todos los formatos</option>
              <option value="pelicula">Películas únicamente</option>
              <option value="serie">Series únicamente</option>
              <option value="anime">Anime</option>
              <option value="documental">Documentales</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-2.5 pr-3 font-bold">Título</th>
                  <th className="py-2.5 pr-3 font-bold">Tipo</th>
                  <th className="py-2.5 pr-3 font-bold">Año / Duración</th>
                  <th className="py-2.5 pr-3 font-bold">Géneros</th>
                  <th className="py-2.5 pr-3 font-bold">Director / Creador</th>
                  <th className="py-2.5 pr-3 font-bold">Nota</th>
                  <th className="py-2.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCatalog.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-10 h-14 rounded-lg object-cover bg-black/40 ring-1 ring-white/10 shrink-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=200&q=80';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">{item.title}</p>
                          {item.originalTitle && item.originalTitle !== item.title && (
                            <p className="text-[10px] text-slate-500 truncate italic">
                              Orig: {item.originalTitle}
                            </p>
                          )}
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {item.defaultPlatform || item.streamingPlatforms?.[0] || 'Catálogo general'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          MEDIA_TYPE_STYLES[item.type] || 'bg-white/10 text-slate-300 border-white/20'
                        }`}
                      >
                        {MEDIA_TYPE_LABELS[item.type] || item.type}
                      </span>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="text-slate-300 font-semibold">{item.year}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {item.duration || (item.seasonsCount ? `${item.seasonsCount} temp` : '—')}
                      </span>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {item.genres.slice(0, 2).map((genre) => (
                          <span
                            key={genre}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/5 text-slate-400"
                          >
                            {genre}
                          </span>
                        ))}
                        {item.genres.length > 2 && (
                          <span className="text-[10px] text-slate-500">+{item.genres.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <p className="text-slate-300 text-xs truncate max-w-[140px]">
                        {item.director || '—'}
                      </p>
                    </td>
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <span className="text-amber-400 font-bold">★ {Number(item.communityRating || 0).toFixed(1)}</span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedMediaId(item.id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                          title="Ver ficha completa"
                          aria-label={`Ver ficha de ${item.title}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditMediaModal(item)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 transition-colors"
                          title="Editar película o serie"
                          aria-label={`Editar ${item.title}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => triggerDeleteMedia(item)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors"
                          title="Quitar del catálogo"
                          aria-label={`Quitar ${item.title} del catálogo`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCatalog.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      No se encontraron títulos con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'users' && (
        <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={userSearch}
                onChange={(event) => setUserSearch(event.target.value)}
                placeholder="Buscar por nombre o correo..."
                className={`${inputClass} pl-9`}
                aria-label="Buscar usuarios"
              />
            </div>
            <select
              value={userRoleFilter}
              onChange={(event) => setUserRoleFilter(event.target.value as typeof userRoleFilter)}
              className={`${inputClass} md:w-44`}
              aria-label="Filtrar por rol"
            >
              <option value="all">Todos los roles</option>
              <option value="owner">Owner</option>
              <option value="admin">Administrador</option>
              <option value="user">Usuario</option>
            </select>
            <select
              value={userStatusFilter}
              onChange={(event) => setUserStatusFilter(event.target.value as typeof userStatusFilter)}
              className={`${inputClass} md:w-40`}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="blocked">Bloqueados</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-2.5 pr-3 font-bold">Usuario</th>
                  <th className="py-2.5 pr-3 font-bold">Rol</th>
                  <th className="py-2.5 pr-3 font-bold">Estado</th>
                  <th className="py-2.5 pr-3 font-bold">Sesiones</th>
                  <th className="py-2.5 pr-3 font-bold">Último acceso</th>
                  <th className="py-2.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => setSelectedUserForModal(user)}
                        className="flex items-center gap-2.5 min-w-[180px] text-left group hover:opacity-95 transition-opacity"
                        title="Abrir ventana de gestión de usuario"
                      >
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10 group-hover:ring-rose-500/50 transition-all"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-slate-200 font-semibold truncate group-hover:text-rose-300 transition-colors">{user.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </button>
                    </td>
                    <td className="py-3 pr-3">
                      <RolePill role={user.role} />
                    </td>
                    <td className="py-3 pr-3">
                      {user.blocked ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300">
                          <Ban className="w-3 h-3" /> Bloqueado
                        </span>
                      ) : user.mustChangePassword ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                          <KeyRound className="w-3 h-3" /> Clave pendiente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" /> Activo
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-slate-400">{user.sessionsCount}</td>
                    <td className="py-3 pr-3 text-slate-500">{formatDate(user.lastLoginAt)}</td>
                    <td className="py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForModal(user)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/25 text-rose-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                          title="Abrir ventana de gestión de usuario"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                          <span>Gestionar</span>
                        </button>
                        {canManageTarget(user) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => triggerUserAction(user, user.blocked ? 'unblock' : 'block')}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                              title={user.blocked ? 'Desbloquear acceso' : 'Bloquear acceso'}
                            >
                              {user.blocked ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Ban className="w-3.5 h-3.5 text-rose-400" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerUserAction(user, 'reset-password')}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 transition-colors"
                              title="Restablecer contraseña (generar clave temporal)"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => triggerUserAction(user, 'force-logout')}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 transition-colors"
                              title="Forzar cierre de todas las sesiones"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && <EmptyState message="No hay usuarios que coincidan con el filtro." />}
          </div>
        </section>
      )}

      {activeTab === 'moderation' && (
        <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={moderationType}
              onChange={(event) => setModerationType(event.target.value as typeof moderationType)}
              className={`${inputClass} w-auto`}
              aria-label="Filtrar por tipo"
            >
              <option value="all">Todo el contenido</option>
              <option value="comment">Comentarios</option>
              <option value="review">Reseñas privadas</option>
            </select>
            <select
              value={moderationStatus}
              onChange={(event) => setModerationStatus(event.target.value as typeof moderationStatus)}
              className={`${inputClass} w-auto`}
              aria-label="Filtrar por visibilidad"
            >
              <option value="all">Todas</option>
              <option value="visible">Visibles</option>
              <option value="hidden">Ocultas</option>
            </select>
            <span className="text-[11px] text-slate-500 ml-auto">{filteredModeration.length} publicaciones</span>
          </div>

          <div className="space-y-2.5">
            {filteredModeration.map((item) => (
              <article
                key={`${item.type}-${item.id}`}
                className={`p-4 rounded-2xl border ${
                  item.hidden ? 'bg-rose-950/20 border-rose-500/20' : 'bg-white/[0.02] border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.avatar ? (
                    <img src={item.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{item.author}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                        {item.type === 'comment' ? 'Comentario' : 'Reseña'}
                      </span>
                      <span className="text-[10px] text-amber-300">★ {item.rating}</span>
                      <span className="text-[10px] text-slate-500">{formatDate(item.createdAt)}</span>
                      <span className="text-[10px] text-slate-500 font-mono truncate">{item.mediaId}</span>
                      {item.hidden && (
                        <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider">Oculto</span>
                      )}
                      {item.deleted && (
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Eliminado</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{item.comment}</p>
                    {item.moderationReason && (
                      <p className="text-[10px] text-amber-300/80">Motivo: {item.moderationReason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.hidden ? (
                      <button
                        type="button"
                        onClick={() => void runModeration(item, 'unhide')}
                        className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-300"
                        title="Volver a mostrar"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void runModeration(item, 'hide')}
                        className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300"
                        title="Ocultar"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void runModeration(item, 'delete')}
                      disabled={item.deleted}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {filteredModeration.length === 0 && <EmptyState message="No hay publicaciones para moderar." />}
          </div>
        </section>
      )}

      {activeTab === 'settings' && settingsForm && (
        <form onSubmit={saveSettings} className={`${cardClass} p-5 space-y-5`}>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-rose-400" />
            <h2 className="font-display text-lg font-black tracking-tight">Configuración general</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Nombre del portal
              </label>
              <input
                id="settings-name"
                value={settingsForm.portalName}
                onChange={(event) => setSettingsForm({ ...settingsForm, portalName: event.target.value })}
                className={inputClass}
                maxLength={80}
              />
            </div>
            <div>
              <label htmlFor="settings-logo" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                URL del logo
              </label>
              <input
                id="settings-logo"
                value={settingsForm.logoUrl || ''}
                onChange={(event) => setSettingsForm({ ...settingsForm, logoUrl: event.target.value })}
                className={inputClass}
                placeholder="/favicon.svg"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="settings-tagline" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Lema
              </label>
              <input
                id="settings-tagline"
                value={settingsForm.tagline}
                onChange={(event) => setSettingsForm({ ...settingsForm, tagline: event.target.value })}
                className={inputClass}
                maxLength={160}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.allowPublicRegistration}
                onChange={(event) => setSettingsForm({ ...settingsForm, allowPublicRegistration: event.target.checked })}
                className="mt-0.5 rounded accent-rose-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-200">Permitir registro público</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Los visitantes pueden crear su propia cuenta.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 cursor-pointer">
              <input
                type="checkbox"
                checked={settingsForm.communityCommentsEnabled}
                onChange={(event) => setSettingsForm({ ...settingsForm, communityCommentsEnabled: event.target.checked })}
                className="mt-0.5 rounded accent-rose-600"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-200">Comentarios de la comunidad</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  Permite publicar reseñas y valoraciones.
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 pt-2">
            <p className="text-[10px] text-slate-500">
              Los cambios se registran en el historial de auditoría del portal.
            </p>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold transition-all"
            >
              <Check className="w-4 h-4" />
              Guardar cambios
            </button>
          </div>
        </form>
      )}

      {activeTab === 'history' && (
        <section className={`${cardClass} p-4 sm:p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-sky-400" />
            <h2 className="font-display text-lg font-black tracking-tight">Historial de moderación y usuarios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-2.5 pr-3 font-bold">Fecha</th>
                  <th className="py-2.5 pr-3 font-bold">Actor</th>
                  <th className="py-2.5 pr-3 font-bold">Acción</th>
                  <th className="py-2.5 pr-3 font-bold">Objetivo</th>
                  <th className="py-2.5 font-bold">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5">
                    <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{formatDate(entry.createdAt)}</td>
                    <td className="py-2.5 pr-3 text-slate-300">{entry.actorName}</td>
                    <td className="py-2.5 pr-3 font-mono text-[10px] text-rose-300">{entry.action}</td>
                    <td className="py-2.5 pr-3 text-slate-400">{entry.targetName || entry.targetId || '—'}</td>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          entry.result === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {entry.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <EmptyState message="No hay eventos en el historial." />}
          </div>
        </section>
      )}

      {activeTab === 'billing' && canManageBilling(currentUser.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={saveBilling} className={`${cardClass} p-5 space-y-4 lg:col-span-2`}>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Facturación</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="billing-plan" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Plan
                </label>
                <input
                  id="billing-plan"
                  value={billingForm.planName}
                  onChange={(event) => setBillingForm({ ...billingForm, planName: event.target.value })}
                  className={inputClass}
                  placeholder="ScreenLog Pro"
                />
              </div>
              <div>
                <label htmlFor="billing-status" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Estado
                </label>
                <input
                  id="billing-status"
                  value={billingForm.planStatus}
                  onChange={(event) => setBillingForm({ ...billingForm, planStatus: event.target.value })}
                  className={inputClass}
                  placeholder="Activo"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="billing-publishable" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Clave publicable de Stripe
                </label>
                <input
                  id="billing-publishable"
                  value={billingForm.stripePublishableKey}
                  onChange={(event) => setBillingForm({ ...billingForm, stripePublishableKey: event.target.value })}
                  className={inputClass}
                  placeholder={billing?.stripePublishableKey ? `Configurada: ${billing.stripePublishableKey}` : 'pk_live_...'}
                  autoComplete="off"
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Deja el campo vacío para conservar la clave actual. Las claves secretas se gestionan en Credenciales.
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
              >
                <Check className="w-4 h-4" />
                Guardar facturación
              </button>
            </div>
          </form>

          <aside className={`${cardClass} p-5 space-y-3`}>
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-sky-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Estado</h2>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Clave secreta</span>
                <span className={billing?.stripeConfigured ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {billing?.stripeConfigured ? 'Configurada' : 'Pendiente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Webhook</span>
                <span className={billing?.webhookConfigured ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {billing?.webhookConfigured ? 'Configurado' : 'Pendiente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Última actualización</span>
                <span className="text-slate-400">{billing?.updatedAt ? formatDate(billing.updatedAt) : '—'}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed pt-2 border-t border-white/5">
              Solo el Owner puede modificar la facturación. Los administradores no ven estas claves.
            </p>
          </aside>
        </div>
      )}

      {activeTab === 'credentials' && canManageCredentials(currentUser.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={saveCredentials} className={`${cardClass} p-5 space-y-4 lg:col-span-2`}>
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Credenciales de API</h2>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Los valores se cifran con AES-256-GCM y nunca se devuelven completos. Escribe solo los campos que quieras
              actualizar.
            </p>
            {[
              { key: 'stripeSecretKey', label: 'Stripe Secret Key', placeholder: 'sk_live_...' },
              { key: 'stripeWebhookSecret', label: 'Stripe Webhook Secret', placeholder: 'whsec_...' },
              { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.ejemplo.com' },
              { key: 'smtpPort', label: 'SMTP Puerto', placeholder: '587' },
              { key: 'smtpUser', label: 'SMTP Usuario', placeholder: 'usuario@ejemplo.com' },
              { key: 'smtpPassword', label: 'SMTP Contraseña', placeholder: '••••••••' },
              { key: 'emailFrom', label: 'Correo remitente', placeholder: 'hola@screenlog.app' },
            ].map((field) => (
              <div key={field.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor={`cred-${field.key}`} className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {field.label}
                  </label>
                  <span
                    className={`text-[10px] font-bold ${
                      credentials[field.key]?.configured ? 'text-emerald-400' : 'text-slate-600'
                    }`}
                  >
                    {credentials[field.key]?.configured ? `Configurada · ${credentials[field.key].masked}` : 'Sin configurar'}
                  </span>
                </div>
                <input
                  id={`cred-${field.key}`}
                  type={field.key.toLowerCase().includes('password') || field.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                  value={credentialForm[field.key] || ''}
                  onChange={(event) => setCredentialForm({ ...credentialForm, [field.key]: event.target.value })}
                  className={inputClass}
                  placeholder={credentials[field.key]?.configured ? 'Escribe para reemplazar' : field.placeholder}
                  autoComplete="off"
                />
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => void testCredential('stripe')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Probar Stripe
              </button>
              <button
                type="button"
                onClick={() => void testCredential('smtp')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors"
              >
                Probar SMTP
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                Guardar credenciales
              </button>
            </div>
          </form>

          <aside className={`${cardClass} p-5 space-y-3`}>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Seguridad</h2>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Las credenciales se guardan cifradas en el servidor. Nunca se envían al navegador en texto plano ni se
              registran en los logs.
            </p>
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-[10px] text-emerald-300/90 leading-relaxed">
              El owner es el único rol que puede ver el estado de estas credenciales. Los administradores no tienen
              acceso a esta sección.
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'logs' && canViewSystemLogs(currentUser.role) && (
        <section className={`${cardClass} p-4 sm:p-5 space-y-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <FileClock className="w-4 h-4 text-sky-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Registros del sistema</h2>
            </div>
            <select value={logCategory} onChange={(event) => setLogCategory(event.target.value)} className={`${inputClass} w-auto`} aria-label="Categoría">
              <option value="all">Todas las categorías</option>
              <option value="auth">Autenticación</option>
              <option value="security">Seguridad</option>
              <option value="moderation">Moderación</option>
              <option value="admin">Administración</option>
              <option value="billing">Facturación</option>
              <option value="infrastructure">Infraestructura</option>
            </select>
            <select value={logLevel} onChange={(event) => setLogLevel(event.target.value)} className={`${inputClass} w-auto`} aria-label="Nivel">
              <option value="all">Todos los niveles</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="security">Security</option>
            </select>
          </div>

          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-[#141416]">
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-2.5 pr-3 font-bold">Fecha</th>
                  <th className="py-2.5 pr-3 font-bold">Nivel</th>
                  <th className="py-2.5 pr-3 font-bold">Categoría</th>
                  <th className="py-2.5 pr-3 font-bold">Mensaje</th>
                  <th className="py-2.5 font-bold">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5">
                    <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          log.level === 'error' || log.level === 'security'
                            ? 'text-rose-400'
                            : log.level === 'warning'
                              ? 'text-amber-400'
                              : 'text-sky-400'
                        }`}
                      >
                        {log.level}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-400">{log.category}</td>
                    <td className="py-2 pr-3 text-slate-300">{log.message}</td>
                    <td className="py-2 font-mono text-[10px] text-slate-500">{log.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && <EmptyState message="No hay registros para los filtros seleccionados." />}
          </div>
        </section>
      )}

      {activeTab === 'admins' && canManageAdmins(currentUser.role) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <section className={`${cardClass} p-5 space-y-4`}>
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-rose-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Administradores</h2>
            </div>
            <div className="space-y-2.5">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/10">
                  <img src={admin.avatar} alt="" className="w-9 h-9 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-200 truncate">{admin.name}</p>
                    <p className="text-[10px] text-slate-500 truncate">{admin.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void revokeAdmin(admin)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300"
                    title="Revocar rol"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {admins.length === 0 && <EmptyState message="Todavía no hay administradores." />}
            </div>

            <form onSubmit={promoteAdmin} className="pt-3 border-t border-white/5 space-y-2">
              <label htmlFor="promote-email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Promover usuario existente
              </label>
              <div className="flex gap-2">
                <input
                  id="promote-email"
                  type="email"
                  value={promoteEmail}
                  onChange={(event) => setPromoteEmail(event.target.value)}
                  placeholder="correo@ejemplo.com"
                  className={inputClass}
                />
                <button
                  type="submit"
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
                >
                  Promover
                </button>
              </div>
            </form>
          </section>

          <form onSubmit={createAdmin} className={`${cardClass} p-5 space-y-4`}>
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <h2 className="font-display text-lg font-black tracking-tight">Crear administrador</h2>
            </div>
            <div>
              <label htmlFor="new-admin-name" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Nombre
              </label>
              <input
                id="new-admin-name"
                value={newAdmin.name}
                onChange={(event) => setNewAdmin({ ...newAdmin, name: event.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="new-admin-email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Correo
              </label>
              <input
                id="new-admin-email"
                type="email"
                value={newAdmin.email}
                onChange={(event) => setNewAdmin({ ...newAdmin, email: event.target.value })}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor="new-admin-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Contraseña inicial
              </label>
              <input
                id="new-admin-password"
                type="password"
                value={newAdmin.password}
                onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })}
                className={inputClass}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold transition-all"
            >
              Crear cuenta de administrador
            </button>
          </form>
        </div>
      )}

      {activeTab === 'transfer' && canTransferOwnership(currentUser.role) && (
        <form onSubmit={transferOwnership} className="max-w-2xl mx-auto rounded-3xl bg-[#141416] border border-amber-500/25 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-amber-400">Acción crítica</p>
              <h2 className="font-display text-xl font-black tracking-tight">Transferir la propiedad</h2>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-[11px] text-rose-200 leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>
              Transferir la propiedad es irreversible desde esta interfaz. El usuario destino pasará a ser Owner y tu
              cuenta quedará como Administrador. Se requiere tu contraseña actual y doble confirmación.
            </span>
          </div>

          <div>
            <label htmlFor="transfer-email" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Correo del nuevo Owner
            </label>
            <input
              id="transfer-email"
              type="email"
              value={transferForm.email}
              onChange={(event) => setTransferForm({ ...transferForm, email: event.target.value })}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="transfer-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Tu contraseña actual
            </label>
            <div className="relative">
              <input
                id="transfer-password"
                type={showTransferPassword ? 'text' : 'password'}
                value={transferForm.password}
                onChange={(event) => setTransferForm({ ...transferForm, password: event.target.value })}
                className={`${inputClass} pr-10`}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowTransferPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                aria-label={showTransferPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showTransferPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="transfer-confirmation" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Escribe TRANSFERIR PROPIEDAD
            </label>
            <input
              id="transfer-confirmation"
              value={transferForm.confirmation}
              onChange={(event) => setTransferForm({ ...transferForm, confirmation: event.target.value })}
              className={inputClass}
              placeholder="TRANSFERIR PROPIEDAD"
              required
            />
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 cursor-pointer">
            <input
              type="checkbox"
              checked={transferForm.doubleConfirm}
              onChange={(event) => setTransferForm({ ...transferForm, doubleConfirm: event.target.checked })}
              className="mt-0.5 rounded accent-rose-600"
            />
            <span className="text-xs text-slate-300">
              Confirmo que entiendo que esta acción cambia permanentemente el propietario del portal.
            </span>
          </label>

          <button
            type="submit"
            disabled={!transferForm.doubleConfirm}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            Transferir propiedad
          </button>
        </form>
      )}

      {tempPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#141416] border border-amber-500/30 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-400" />
                <h3 className="font-display text-lg font-black tracking-tight">Contraseña temporal</h3>
              </div>
              <button type="button" onClick={() => setTempPassword(null)} aria-label="Cerrar">
                <X className="w-5 h-5 text-slate-500 hover:text-white" />
              </button>
            </div>
            <p className="text-sm text-slate-300">
              Se restableció la contraseña de <strong className="text-white">{tempPassword.name}</strong> ({tempPassword.email}).
              Se muestra una sola vez. Compártela por un canal seguro y pide al usuario que la cambie al entrar.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 rounded-xl bg-[#0A0A0B] border border-white/10 text-amber-300 font-mono text-sm break-all">
                {tempPassword.password}
              </code>
              <button
                type="button"
                onClick={() => void copyTempPassword()}
                className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300"
                title="Copiar"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setTempPassword(null)}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold transition-colors"
            >
              Entendido, ocultar contraseña
            </button>
          </div>
        </div>
      )}

      {/* VENTANA DE GESTIÓN DE USUARIO */}
      {selectedUserForModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#141416] border border-white/15 p-6 sm:p-7 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={selectedUserForModal.avatar}
                  alt={selectedUserForModal.name}
                  className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white/10 bg-black/40"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="font-display text-lg font-black text-white tracking-tight flex items-center gap-2">
                    {selectedUserForModal.name}
                    <RolePill role={selectedUserForModal.role} />
                  </h3>
                  <p className="text-xs text-slate-400">{selectedUserForModal.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                aria-label="Cerrar ventana"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Badges & Status summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/5 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Estado</span>
                <span className="text-xs font-bold mt-1 inline-block">
                  {selectedUserForModal.blocked ? (
                    <span className="text-rose-400">Bloqueado</span>
                  ) : selectedUserForModal.mustChangePassword ? (
                    <span className="text-amber-400">Clave pendiente</span>
                  ) : (
                    <span className="text-emerald-400">Activo</span>
                  )}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/5 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Sesiones</span>
                <span className="text-xs font-bold text-slate-200 mt-1 inline-block">
                  {selectedUserForModal.sessionsCount} activas
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/5 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Último acceso</span>
                <span className="text-xs font-bold text-slate-300 mt-1 inline-block truncate max-w-full">
                  {formatDate(selectedUserForModal.lastLoginAt) || 'Nunca'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/5 text-center">
                <span className="block text-[10px] uppercase font-bold text-slate-500">Registro</span>
                <span className="text-xs font-bold text-slate-300 mt-1 inline-block truncate max-w-full">
                  {formatDate(selectedUserForModal.createdAt)}
                </span>
              </div>
            </div>

            {/* Action buttons inside this window */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Acciones sobre esta cuenta
              </h4>

              {canManageTarget(selectedUserForModal) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => triggerUserAction(selectedUserForModal, selectedUserForModal.blocked ? 'unblock' : 'block')}
                    className={`p-3 rounded-2xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-colors ${
                      selectedUserForModal.blocked
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {selectedUserForModal.blocked ? <Check className="w-4 h-4 flex-shrink-0" /> : <Ban className="w-4 h-4 flex-shrink-0" />}
                    <div>
                      <span className="block font-bold">{selectedUserForModal.blocked ? 'Desbloquear acceso' : 'Bloquear usuario'}</span>
                      <span className="text-[10px] opacity-75">{selectedUserForModal.blocked ? 'Permitir inicio de sesión' : 'Suspender inmediatamente'}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerUserAction(selectedUserForModal, 'reset-password')}
                    className="p-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors"
                  >
                    <KeyRound className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span className="block font-bold">Generar clave temporal</span>
                      <span className="text-[10px] opacity-75">Restablecer contraseña</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerUserAction(selectedUserForModal, 'force-logout')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors"
                  >
                    <Lock className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <span className="block font-bold">Cerrar sesiones</span>
                      <span className="text-[10px] opacity-75">Desconectar dispositivos</span>
                    </div>
                  </button>

                  {/* If current user is Owner, promote or demote */}
                  {isOwnerUser && selectedUserForModal.role === 'user' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDialog({
                          title: `¿Promover a ${selectedUserForModal.name} como Administrador?`,
                          description: 'Tendrá permisos para moderar contenido, gestionar catálogo y revisar reportes.',
                          confirmLabel: 'Promover a Administrador',
                          onConfirm: async () => {
                            setActionLoading(true);
                            try {
                              await apiRequest('/api/owner/admins', {
                                method: 'POST',
                                body: JSON.stringify({ email: selectedUserForModal.email, mode: 'promote' }),
                              });
                              await loadCore();
                              setSelectedUserForModal((prev) => (prev ? { ...prev, role: 'admin' } : null));
                              flash('Usuario promovido a Administrador con éxito.');
                              setConfirmDialog(null);
                            } catch (e) {
                              handleError(e);
                            } finally {
                              setActionLoading(false);
                            }
                          },
                        });
                      }}
                      className="p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors"
                    >
                      <Crown className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <span className="block font-bold">Promover a Admin</span>
                        <span className="text-[10px] opacity-75">Otorgar privilegios</span>
                      </div>
                    </button>
                  )}

                  {isOwnerUser && selectedUserForModal.role === 'admin' && (
                    <button
                      type="button"
                      onClick={() => triggerRevokeAdmin(selectedUserForModal)}
                      className="p-3 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/30 text-slate-300 text-left text-xs font-semibold flex items-center gap-2.5 transition-colors"
                    >
                      <UserCog className="w-4 h-4 flex-shrink-0" />
                      <div>
                        <span className="block font-bold">Revocar Admin</span>
                        <span className="text-[10px] opacity-75">Volver a usuario regular</span>
                      </div>
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 text-xs text-slate-400">
                  {selectedUserForModal.id === currentUser.id ? (
                    <span>Esta es tu cuenta activa. Para cambiar tus datos o contraseña, ve a <strong>Mi Cuenta</strong> en la barra de navegación superior.</span>
                  ) : selectedUserForModal.role === 'owner' ? (
                    <span>Esta cuenta pertenece al <strong>Propietario del portal</strong>. Su rol y accesos solo pueden modificarse mediante transferencia de propiedad.</span>
                  ) : (
                    <span>No tienes los permisos requeridos para gestionar este usuario.</span>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserForModal(null)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-colors"
              >
                Cerrar ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIÁLOGO MODAL DE CONFIRMACIÓN (REEMPLAZA WINDOW.CONFIRM) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-[#141416] border border-white/20 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${confirmDialog.danger ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-amber-600/20 text-amber-400 border border-amber-500/30'}`}>
                {confirmDialog.danger ? <AlertTriangle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base font-black text-white tracking-tight">{confirmDialog.title}</h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {confirmDialog.description}
            </p>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  if (!actionLoading) setConfirmDialog(null);
                }}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmDialog.onConfirm()}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors flex items-center gap-2 ${
                  confirmDialog.danger
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-900/30'
                } disabled:opacity-50`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmDialog.confirmLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
