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
import { apiRequest, ApiError, formatDate } from '../lib/api';

type AdminTab =
  | 'summary'
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
  const { currentUser, refresh } = useAuth();
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

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | UserAccount['role']>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [moderationType, setModerationType] = useState<'all' | 'comment' | 'review'>('all');
  const [moderationStatus, setModerationStatus] = useState<'all' | 'visible' | 'hidden'>('all');
  const [tempPassword, setTempPassword] = useState<{ name: string; email: string; password: string } | null>(null);

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

  const summary = {
    totalUsers: users.length,
    blockedUsers: users.filter((user) => user.blocked).length,
    staff: users.filter((user) => user.role !== 'user').length,
    pendingPassword: users.filter((user) => user.mustChangePassword).length,
    comments: moderation.filter((item) => item.type === 'comment' && !item.deleted).length,
    reviews: moderation.filter((item) => item.type === 'review').length,
    hidden: moderation.filter((item) => item.hidden).length,
  };

  const runUserAction = async (
    user: AdminUser,
    action: 'block' | 'unblock' | 'reset-password' | 'force-logout',
  ) => {
    const confirmations: Record<typeof action, string> = {
      block: `¿Bloquear a ${user.name}? Se cerrarán todas sus sesiones.`,
      unblock: `¿Desbloquear a ${user.name}?`,
      'reset-password': `¿Restablecer la contraseña de ${user.name}? Se generará una temporal y se cerrarán sus sesiones.`,
      'force-logout': `¿Cerrar todas las sesiones de ${user.name}?`,
    };
    if (!window.confirm(confirmations[action])) return;
    try {
      const response = await apiRequest<{ success: boolean; data: AdminUser & { temporaryPassword?: string } }>(
        `/api/admin/users/${encodeURIComponent(user.id)}/${action}`,
        { method: 'POST' },
      );
      await loadCore();
      if (action === 'reset-password' && response.data?.temporaryPassword) {
        setTempPassword({ name: user.name, email: user.email, password: response.data.temporaryPassword });
        setNotice('Contraseña temporal generada. Se muestra una sola vez en el diálogo.');
      } else {
        flash('Acción completada correctamente.');
      }
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const runModeration = async (item: ModerationItem, action: 'hide' | 'unhide' | 'delete') => {
    if (action !== 'unhide' && !window.confirm(`¿${action === 'hide' ? 'Ocultar' : 'Eliminar'} esta publicación?`)) return;
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
    } catch (requestError) {
      handleError(requestError);
    }
  };

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

  const revokeAdmin = async (admin: AdminUser) => {
    if (!window.confirm(`¿Revocar el rol de administrador a ${admin.name}?`)) return;
    try {
      await apiRequest(`/api/owner/admins/${encodeURIComponent(admin.id)}`, { method: 'DELETE' });
      const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
      setAdmins(response.data || []);
      flash('Rol de administrador revocado.');
      await loadCore();
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const transferOwnership = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!window.confirm('Esta acción transferirá la propiedad del portal de forma permanente. ¿Continuar?')) return;
    try {
      await apiRequest<TransferResponse>('/api/owner/transfer-ownership', {
        method: 'POST',
        body: JSON.stringify(transferForm),
      });
      setTransferForm({ email: '', password: '', confirmation: '', doubleConfirm: false });
      flash('Propiedad transferida. Tu rol ahora es Administrador.');
      await refresh();
      await loadCore();
    } catch (requestError) {
      handleError(requestError);
    }
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
        <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                  <span className="text-slate-500">Administradores</span>
                  <span className="text-slate-200 font-bold">{users.filter((user) => user.role === 'admin').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Owner</span>
                  <span className="text-slate-200 font-bold">{users.filter((user) => user.role === 'owner').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Cambio de clave pendiente</span>
                  <span className="text-slate-200 font-bold">{summary.pendingPassword}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Reseñas privadas</span>
                  <span className="text-slate-200 font-bold">{summary.reviews}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-white/5">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Los permisos se validan en el servidor en cada solicitud. Los administradores no pueden modificar al
                  Owner ni a otros administradores.
                </p>
              </div>
            </section>
          </div>
        </div>
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
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-8 h-8 rounded-lg object-cover ring-1 ring-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-slate-200 font-semibold truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                        </div>
                      </div>
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
                        {canManageTarget(user) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => void runUserAction(user, user.blocked ? 'unblock' : 'block')}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                              title={user.blocked ? 'Desbloquear' : 'Bloquear'}
                            >
                              {user.blocked ? <Check className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => void runUserAction(user, 'reset-password')}
                              className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-300 transition-colors"
                              title="Restablecer contraseña"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void runUserAction(user, 'force-logout')}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 transition-colors"
                              title="Forzar cierre de sesión"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-600">Sin acciones</span>
                        )}
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
    </div>
  );
};
