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
  Cloud,
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
import {
  DEFAULT_PORTAL_MODULES,
  DEFAULT_RATING_BOXES,
  mergePortalModules,
  mergeRatingBoxes,
  type MediaItem,
  type MediaType,
  type PortalModulesConfig,
  type RatingBoxesConfig,
  type SupportTicket,
  type SupportTicketStatus,
} from '../types';
import { apiRequest, ApiError, formatDate } from '../lib/api';
import { pingFirestore, seedCatalogToFirestore } from '../lib/firebase';
import { provisionFirebaseUserAsAdmin } from '../lib/firebaseAuthBridge';
import {
  getFirestoreDiagnostics,
  clearMonitorWatchlistEntries,
  getSystemConfig,
  grantAdminInFirestore,
  inspectDatabaseMonitoringSnapshot,
  revokeAdminInFirestore,
  saveSystemConfigToFirestore,
  updateUserBlockedFlagInFirestore,
  type DatabaseMonitoringSnapshot,
} from '../lib/firestore';
import {
  subscribeToSupportTickets,
  updateSupportTicketInFirestore,
  deleteSupportTicketInFirestore,
} from '../lib/firestore/support';
import { listUserAccounts, type FirestoreUserSummary } from '../lib/firestore/users';

type AdminTab =
  | 'summary'
  | 'modules'
  | 'support'
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

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80';

function slugifyUsername(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9._-]/g, '') || 'cinefilo'
  );
}

/**
 * Convierte un perfil de `users/{uid}` en una fila del panel.
 * Sirve para mostrar cuentas que solo viven en Firestore (por ejemplo, cuando
 * el servidor se reinició y perdió su JSON local).
 */
function cloudUserToAdminUser(cloud: FirestoreUserSummary): AdminUser {
  const createdAt = cloud.createdAt ? cloud.createdAt.toISOString() : new Date().toISOString();
  const name = cloud.displayName || cloud.email.split('@')[0] || 'Cinéfilo';
  return {
    id: cloud.uid,
    name,
    username: slugifyUsername(name),
    email: cloud.email,
    role: 'user',
    avatar: cloud.photoURL || DEFAULT_AVATAR,
    bio: '',
    favoriteGenres: cloud.favoriteGenres,
    city: '',
    platforms: [],
    socialLinks: {},
    customFields: [],
    blocked: false,
    mustChangePassword: false,
    joinedDate: createdAt.slice(0, 10),
    createdAt,
    lastLoginAt: null,
    sessionsCount: 0,
  };
}

/** Une las cuentas del servidor con las de Firestore, sin duplicar, propagando firebaseUid. */
function mergeAdminUsers(serverUsers: AdminUser[], cloudUsers: FirestoreUserSummary[]): AdminUser[] {
  const rows = serverUsers.map((row) => ({ ...row }));
  const byEmail = new Map<string, AdminUser>();
  const knownIds = new Set<string>();

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (email) byEmail.set(email, row);
    knownIds.add(row.id);
    if (row.firebaseUid) knownIds.add(row.firebaseUid);
  }

  for (const cloud of cloudUsers) {
    const email = cloud.email.trim().toLowerCase();
    const existingByEmail = email ? byEmail.get(email) : undefined;
    if (existingByEmail) {
      if (!existingByEmail.firebaseUid) existingByEmail.firebaseUid = cloud.uid;
      existingByEmail.syncedWithFirebase = true;
      continue;
    }
    if (knownIds.has(cloud.uid)) continue;
    const mapped: AdminUser = {
      ...cloudUserToAdminUser(cloud),
      firebaseUid: cloud.uid,
      syncedWithFirebase: true,
    };
    rows.push(mapped);
    if (email) byEmail.set(email, mapped);
    knownIds.add(cloud.uid);
  }

  return rows.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
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
  modules?: PortalModulesConfig;
  ratingBoxes?: RatingBoxesConfig;
  monitorModeEnforced?: boolean;
  updatedAt?: string;
}

const MODULE_CHECKBOX_ITEMS: { key: keyof PortalModulesConfig; label: string; desc: string }[] = [
  { key: 'explorar', label: 'Explorar catálogo', desc: 'Muestra la pestaña Explorar para navegar todo el catálogo.' },
  { key: 'match', label: 'CineMatch', desc: 'Muestra el recomendador inteligente por afinidad o ambiente.' },
  { key: 'miLista', label: 'Mi Lista personal', desc: 'Permite a los usuarios gestionar su watchlist y reseñas.' },
  { key: 'estadisticas', label: 'Estadísticas y rangos', desc: 'Muestra gráficos y métricas cinéfilas del usuario.' },
  { key: 'ruleta', label: 'Ruleta ¿Qué veo hoy?', desc: 'Activa el botón rápido de ruleta en la barra superior.' },
  { key: 'asistenteIA', label: 'Asistente IA', desc: 'Habilita el chat de asistencia cinematográfica.' },
  { key: 'addTitle', label: 'Botón Añadir Título', desc: 'Permite añadir nuevas películas o series al catálogo.' },
  { key: 'comentarios', label: 'Comentarios públicos', desc: 'Muestra la pestaña y publicación de comentarios por título.' },
  { key: 'soporte', label: 'Centro de Soporte', desc: 'Habilita la sección pública de contacto y tickets.' },
];

const RATING_BOX_ITEMS: { key: keyof RatingBoxesConfig; label: string; desc: string }[] = [
  { key: 'stars', label: 'Calificación con estrellas', desc: 'Selector principal de 0.5 a 5 estrellas.' },
  { key: 'evaluation', label: 'Etiqueta de evaluación general', desc: 'Botones rápidos (Obra Maestra, Excelente, Regular...).' },
  { key: 'critique', label: 'Crítica / Opinión personal', desc: 'Caja de texto libre para análisis detallado.' },
  { key: 'detailedAxes', label: 'Desglose técnico (7 ejes)', desc: 'Guión, Actuaciones, Dirección, Audio, Visuales, Ritmo, Emoción.' },
  { key: 'watchedDate', label: 'Fecha en que la vi', desc: 'Selector de fecha de visualización.' },
  { key: 'watchPlatform', label: 'Dónde la vi (Plataforma)', desc: 'Selector de plataforma o sitio personalizado.' },
  { key: 'wouldRewatch', label: '¿La volvería a ver?', desc: 'Opciones de re-visionado.' },
  { key: 'recommendation', label: '¿La recomiendas?', desc: 'Sí / Con reservas / No.' },
  { key: 'moodRecommendation', label: 'Estado de ánimo / Momento ideal', desc: 'Chips y texto de cuándo conviene verla.' },
  { key: 'shortVerdict', label: 'Veredicto en pocas palabras', desc: 'Titular corto de la reseña.' },
  { key: 'favoriteCharacter', label: 'Personaje favorito', desc: 'Campo de personaje o interpretación destacada.' },
  { key: 'quote', label: 'Frase o diálogo memorable', desc: 'Cita destacada de la película.' },
  { key: 'tags', label: 'Etiquetas cinéfilas', desc: 'Chips de sensaciones y atributos.' },
];

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
  novela: 'Novela',
};

const MEDIA_TYPE_STYLES: Record<MediaType, string> = {
  pelicula: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  serie: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  anime: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  documental: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  novela: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
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
  const { currentUser, refresh, requestLogin, firebaseLinkError, linkFirebaseSession } = useAuth();
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
  const [showCreateUserForm, setShowCreateUserForm] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'user' as 'user' | 'admin',
  });
  const [dbSnapshot, setDbSnapshot] = useState<DatabaseMonitoringSnapshot | null>(null);
  const [loadingDbSnapshot, setLoadingDbSnapshot] = useState(false);
  const [cleaningMonitor, setCleaningMonitor] = useState(false);
  const [modulesDraft, setModulesDraft] = useState<PortalModulesConfig>({ ...DEFAULT_PORTAL_MODULES });
  const [ratingBoxesDraft, setRatingBoxesDraft] = useState<RatingBoxesConfig>({ ...DEFAULT_RATING_BOXES });
  const [savingModules, setSavingModules] = useState(false);
  const [firestoreTickets, setFirestoreTickets] = useState<SupportTicket[]>([]);
  const [serverTickets, setServerTickets] = useState<SupportTicket[]>([]);
  const [ticketDrafts, setTicketDrafts] = useState<Record<string, { status: SupportTicketStatus; adminNote: string }>>({});
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState({ email: '', password: '', confirmation: '', doubleConfirm: false });
  const [showTransferPassword, setShowTransferPassword] = useState(false);

  const [firestoreStatus, setFirestoreStatus] = useState<{
    checked: boolean;
    loading: boolean;
    ok: boolean;
    latencyMs?: number;
    message?: string;
    docCount?: number;
  }>({
    checked: false,
    loading: false,
    ok: true,
    latencyMs: undefined,
    message: '',
    docCount: 0,
  });

  const checkFirestore = useCallback(async () => {
    setFirestoreStatus((prev) => ({ ...prev, loading: true }));
    try {
      const res = await pingFirestore();
      setFirestoreStatus({
        checked: true,
        loading: false,
        ok: res.ok,
        latencyMs: res.latencyMs,
        message: res.message,
        docCount: res.docCount,
      });
    } catch (e: any) {
      setFirestoreStatus({
        checked: true,
        loading: false,
        ok: false,
        message: e?.message || 'Error al conectar con Firestore',
        docCount: 0,
      });
    }
  }, []);

  const [firebaseDiag, setFirebaseDiag] = useState(() => getFirestoreDiagnostics());
  const [isLinkingFirebase, setIsLinkingFirebase] = useState(false);

  const refreshFirebaseDiag = useCallback(() => {
    setFirebaseDiag(getFirestoreDiagnostics());
  }, []);

  const handleLinkFirebase = useCallback(async () => {
    if (isLinkingFirebase) return;
    setIsLinkingFirebase(true);
    try {
      const result = await linkFirebaseSession('');
      if (result.success) {
        refreshFirebaseDiag();
        flash('Sesión de Firebase vinculada. Recargando la app...');
        window.setTimeout(() => window.location.reload(), 900);
      } else {
        setError(result.message || 'No se pudo vincular la sesión de Firebase.');
        refreshFirebaseDiag();
      }
    } finally {
      setIsLinkingFirebase(false);
    }
  }, [isLinkingFirebase, linkFirebaseSession, refreshFirebaseDiag]);

  const [isSeedingFirestore, setIsSeedingFirestore] = useState(false);

  const handleSeedFirestore = async () => {
    if (isSeedingFirestore) return;
    setIsSeedingFirestore(true);
    try {
      const res = await seedCatalogToFirestore(mediaList);
      flash(`Se sincronizaron ${res.success} de ${mediaList.length} títulos a Firebase Firestore.`);
      await checkFirestore();
    } catch (err: any) {
      setError(err?.message || 'Error al subir catálogo a Firestore');
    } finally {
      setIsSeedingFirestore(false);
    }
  };

  const [isSyncingUsers, setIsSyncingUsers] = useState(false);

  const handleSyncUsers = async () => {
    if (isSyncingUsers) return;
    setIsSyncingUsers(true);
    setError('');
    try {
      const cloudUsers = await listUserAccounts();
      if (cloudUsers.length === 0) {
        setError(
          'No se pudieron leer los usuarios de Firestore. Revisá que la sesión de Firebase esté activa.',
        );
        return;
      }
      const response = await apiRequest<{
        success: boolean;
        data: { created: number; updated: number; skipped: number; total: number };
      }>('/api/admin/sync-users', {
        method: 'POST',
        body: JSON.stringify({
          users: cloudUsers.map((user) => ({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            favoriteGenres: user.favoriteGenres,
            createdAt: user.createdAt ? user.createdAt.toISOString() : null,
          })),
        }),
      });
      const { created, updated, total } = response.data;
      flash(
        `Sincronizado: ${created} recuperados, ${updated} actualizados. Total en el servidor: ${total}.`,
      );
      await loadCore();
    } catch (syncError) {
      handleError(syncError);
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const isOwnerUser = isOwner(currentUser?.role);
  const tabs = useMemo(() => {
    const base: { id: AdminTab; label: string; icon: React.ElementType }[] = [
      { id: 'summary', label: 'Monitoreo BD', icon: BarChart3 },
      { id: 'modules', label: 'Casillas', icon: Sparkles },
      { id: 'support', label: 'Soporte', icon: MessageSquare },
      { id: 'users', label: 'Usuarios', icon: Users },
      { id: 'catalog', label: 'Catálogo', icon: Film },
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
    // Firestore sobrevive a los reinicios del servidor: es la fuente principal
    // de la lista de usuarios. La API solo aporta roles, bloqueos y sesiones.
    const cloudUsers = await listUserAccounts();
    let serverUsers: AdminUser[] = [];
    try {
      const [usersResponse, moderationResponse, historyResponse] = await Promise.all([
        apiRequest<{ success: boolean; data: AdminUser[] }>('/api/admin/users'),
        apiRequest<{ success: boolean; data: ModerationItem[] }>('/api/admin/moderation'),
        apiRequest<{ success: boolean; data: AuditLog[] }>('/api/admin/history'),
      ]);
      serverUsers = usersResponse.data || [];
      setModeration(moderationResponse.data || []);
      setHistory(historyResponse.data || []);
    } catch (requestError) {
      handleError(requestError);
    }
    setUsers(mergeAdminUsers(serverUsers, cloudUsers));
    setLoading(false);
  }, []);

  const refreshDbMonitoring = useCallback(async () => {
    setLoadingDbSnapshot(true);
    try {
      const diag = getFirestoreDiagnostics();
      const snapshot = await inspectDatabaseMonitoringSnapshot(diag.session.uid);
      setDbSnapshot(snapshot);
    } catch (err) {
      console.warn('No se pudo obtener telemetría de Firestore:', err);
    } finally {
      setLoadingDbSnapshot(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
    void checkFirestore();
    void refreshDbMonitoring();
  }, [loadCore, checkFirestore, refreshDbMonitoring]);

  useEffect(() => {
    if (activeTab !== 'support' && activeTab !== 'summary') return;
    const unsub = subscribeToSupportTickets({ isAdmin: true }, (list) => {
      setFirestoreTickets(list);
    });
    apiRequest<{ success: boolean; data: SupportTicket[] }>('/api/admin/tickets')
      .then((res) => setServerTickets(res.data || []))
      .catch(() => undefined);
    return () => unsub();
  }, [activeTab]);

  useEffect(() => {
    if (!activeTab) return;
    let cancelled = false;
    (async () => {
      try {
        if (activeTab === 'settings' || activeTab === 'modules') {
          const [serverRes, cloudConfig] = await Promise.all([
            apiRequest<{ success: boolean; data: AdminSettings }>('/api/admin/settings').catch(() => null),
            getSystemConfig(),
          ]);
          if (cancelled) return;
          const merged: AdminSettings = {
            portalName: cloudConfig?.portalName || serverRes?.data?.portalName || 'TakeVault',
            tagline: cloudConfig?.tagline || serverRes?.data?.tagline || 'Tu Diario Cinematográfico Privado',
            logoUrl: cloudConfig?.logoUrl || serverRes?.data?.logoUrl || '/favicon.svg',
            allowPublicRegistration:
              cloudConfig?.allowPublicRegistration ?? serverRes?.data?.allowPublicRegistration ?? true,
            communityCommentsEnabled:
              cloudConfig?.communityCommentsEnabled ?? serverRes?.data?.communityCommentsEnabled ?? true,
            catalogPerPage: cloudConfig?.catalogPerPage ?? serverRes?.data?.catalogPerPage ?? 24,
            modules: mergePortalModules(cloudConfig?.modules || serverRes?.data?.modules),
            ratingBoxes: mergeRatingBoxes(cloudConfig?.ratingBoxes || serverRes?.data?.ratingBoxes),
            monitorModeEnforced:
              cloudConfig?.monitorModeEnforced ?? serverRes?.data?.monitorModeEnforced ?? true,
          };
          setSettings(merged);
          setSettingsForm(merged);
          setModulesDraft(mergePortalModules(merged.modules));
          setRatingBoxesDraft(mergeRatingBoxes(merged.ratingBoxes));
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
      description: `Esta acción quitará de forma permanente este título (${typeLabel}, ${media.year}) del catálogo de TakeVault y registrará la acción en la auditoría.`,
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

      if (action === 'block' || action === 'unblock') {
        const targetUid = user.firebaseUid || response.data?.firebaseUid || user.id;
        await updateUserBlockedFlagInFirestore(targetUid, user.email, action === 'block');
      }

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
      unblock: `El usuario podrá volver a acceder a TakeVault Pro normalmente.`,
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
      const payload = {
        ...settingsForm,
        modules: modulesDraft,
        ratingBoxes: ratingBoxesDraft,
      };
      const [serverRes] = await Promise.all([
        apiRequest<{ success: boolean; data: AdminSettings }>('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        }),
        saveSystemConfigToFirestore(payload, currentUser.id).catch((err) => {
          console.warn('No se pudo guardar config en Firestore:', err);
          return null;
        }),
      ]);
      setSettings(serverRes.data);
      setSettingsForm(serverRes.data);
      flash('Configuración general y de Firestore guardadas.');
      await refresh();
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const handleSaveModulesAndBoxes = async (
    nextModules: PortalModulesConfig = modulesDraft,
    nextBoxes: RatingBoxesConfig = ratingBoxesDraft,
  ) => {
    setSavingModules(true);
    setError('');
    try {
      const base = settingsForm || settings || {
        portalName: 'TakeVault',
        tagline: 'Tu Diario Cinematográfico Privado',
        logoUrl: '/favicon.svg',
        allowPublicRegistration: true,
        communityCommentsEnabled: true,
        catalogPerPage: 24,
      };
      const payload = {
        ...base,
        communityCommentsEnabled: nextModules.comentarios,
        modules: nextModules,
        ratingBoxes: nextBoxes,
        monitorModeEnforced: true,
      };
      await Promise.all([
        saveSystemConfigToFirestore(payload, currentUser.id),
        apiRequest('/api/admin/settings', {
          method: 'PUT',
          body: JSON.stringify(payload),
        }).catch(() => undefined),
      ]);
      setSettingsForm((prev) => (prev ? { ...prev, ...payload } : (payload as AdminSettings)));
      flash('Casillas y módulos actualizados en tiempo real en Firestore.');
      await refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron guardar las casillas en Firestore.',
      );
    } finally {
      setSavingModules(false);
    }
  };

  const handleCreateUserFromAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (creatingUser) return;
    setError('');
    setCreatingUser(true);
    try {
      const fbProvision = await provisionFirebaseUserAsAdmin({
        email: newUserForm.email,
        password: newUserForm.password,
        name: newUserForm.name,
        username: newUserForm.username || undefined,
      });
      if (!fbProvision.ok) {
        setError(
          `Firebase: ${'message' in fbProvision ? fbProvision.message : 'No se pudo provisionar el usuario.'}`,
        );
        return;
      }

      await apiRequest('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newUserForm.name.trim(),
          username: newUserForm.username.trim() || undefined,
          email: newUserForm.email.trim(),
          password: newUserForm.password,
          role: newUserForm.role,
          firebaseUid: fbProvision.uid,
        }),
      });

      if (newUserForm.role === 'admin' && isOwnerUser) {
        await grantAdminInFirestore({
          uid: fbProvision.uid,
          email: newUserForm.email.trim().toLowerCase(),
          name: newUserForm.name.trim(),
          grantedBy: firebaseDiag.session.uid || currentUser.id,
        }).catch(() => undefined);
      }

      setNewUserForm({ name: '', username: '', email: '', password: '', role: 'user' });
      setShowCreateUserForm(false);
      flash(
        `Usuario creado y registrado en Firebase Auth + Firestore (UID: ${fbProvision.uid}).`,
      );
      await Promise.all([loadCore(), refreshDbMonitoring()]);
    } catch (err) {
      handleError(err);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCleanupMonitorLibrary = async () => {
    if (cleaningMonitor) return;
    setCleaningMonitor(true);
    setError('');
    try {
      const uid = firebaseDiag.session.uid || 'bZGMhRTm7aOUoRDlYbabZN2Aotk2';
      const [cloudRes, serverRes] = await Promise.all([
        clearMonitorWatchlistEntries(uid),
        apiRequest<{ success: boolean; data: { removedCount: number } }>(
          '/api/admin/cleanup-monitor-library',
          { method: 'POST' },
        ).catch(() => ({ data: { removedCount: 0 } })),
      ]);
      const totalCleaned =
        cloudRes.removedClassifications +
        cloudRes.removedLegacy +
        (serverRes.data?.removedCount || 0);
      flash(
        `Limpieza de cuenta monitor completada: ${totalCleaned} película(s) personal(es) eliminada(s) de Daemon.`,
      );
      await refreshDbMonitoring();
    } catch (err) {
      handleError(err);
    } finally {
      setCleaningMonitor(false);
    }
  };

  const mergedTickets = useMemo(() => {
    const map = new Map<string, SupportTicket>();
    for (const s of serverTickets) map.set(s.id, s);
    for (const f of firestoreTickets) {
      const prev = map.get(f.id);
      map.set(f.id, prev ? { ...prev, ...f, source: 'both' } : f);
    }
    return Array.from(map.values()).sort((a, b) =>
      (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''),
    );
  }, [firestoreTickets, serverTickets]);

  const handleSaveTicket = async (ticket: SupportTicket) => {
    const draft = ticketDrafts[ticket.id] || {
      status: ticket.status,
      adminNote: ticket.adminNote || '',
    };
    setSavingTicketId(ticket.id);
    try {
      const ops: Promise<unknown>[] = [];
      if (ticket.source === 'firestore' || ticket.source === 'both') {
        ops.push(
          updateSupportTicketInFirestore(ticket.id, {
            status: draft.status,
            adminNote: draft.adminNote,
            resolvedBy: currentUser.name,
          }),
        );
      }
      if (ticket.source === 'server' || ticket.source === 'both') {
        ops.push(
          apiRequest(`/api/admin/tickets/${encodeURIComponent(ticket.id)}`, {
            method: 'PATCH',
            body: JSON.stringify({
              status: draft.status,
              adminNote: draft.adminNote,
            }),
          }).catch(() => undefined),
        );
      }
      await Promise.all(ops);
      flash(`Ticket "${ticket.subject}" actualizado.`);
      if (ticket.source === 'server' || ticket.source === 'both') {
        apiRequest<{ success: boolean; data: SupportTicket[] }>('/api/admin/tickets')
          .then((res) => setServerTickets(res.data || []))
          .catch(() => undefined);
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSavingTicketId(null);
    }
  };

  const handleDeleteTicket = async (ticket: SupportTicket) => {
    try {
      if (ticket.source === 'firestore' || ticket.source === 'both') {
        await deleteSupportTicketInFirestore(ticket.id);
      }
      if (ticket.source === 'server' || ticket.source === 'both') {
        await apiRequest(`/api/admin/tickets/${encodeURIComponent(ticket.id)}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }
      setServerTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      flash('Ticket eliminado.');
    } catch (err) {
      handleError(err);
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
      const targetEmail = promoteEmail.trim().toLowerCase();
      await apiRequest('/api/owner/admins', {
        method: 'POST',
        body: JSON.stringify({ mode: 'promote', email: targetEmail }),
      });
      const matchedUser = users.find((u) => u.email.trim().toLowerCase() === targetEmail);
      const targetUid = matchedUser?.firebaseUid || matchedUser?.id;
      if (targetUid) {
        await grantAdminInFirestore({
          uid: targetUid,
          email: targetEmail,
          name: matchedUser?.name,
          grantedBy: firebaseDiag.session.uid || currentUser.id,
        }).catch(() => undefined);
      }
      setPromoteEmail('');
      const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
      setAdmins(response.data || []);
      flash('Usuario promovido a administrador en servidor y Firestore.');
      await Promise.all([loadCore(), refreshDbMonitoring()]);
    } catch (requestError) {
      handleError(requestError);
    }
  };

  const createAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const fbProvision = await provisionFirebaseUserAsAdmin({
        email: newAdmin.email,
        password: newAdmin.password,
        name: newAdmin.name,
      });
      await apiRequest('/api/owner/admins', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'create',
          ...newAdmin,
          firebaseUid: fbProvision.ok ? fbProvision.uid : undefined,
        }),
      });
      if (fbProvision.ok) {
        await grantAdminInFirestore({
          uid: fbProvision.uid,
          email: newAdmin.email.trim().toLowerCase(),
          name: newAdmin.name.trim(),
          grantedBy: firebaseDiag.session.uid || currentUser.id,
        }).catch(() => undefined);
      }
      setNewAdmin({ name: '', email: '', password: '' });
      const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
      setAdmins(response.data || []);
      flash(
        fbProvision.ok
          ? 'Cuenta de administrador creada en servidor, Firebase Auth y Firestore.'
          : 'Cuenta de administrador creada en servidor.',
      );
      await Promise.all([loadCore(), refreshDbMonitoring()]);
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
          const targetUid = admin.firebaseUid || admin.id;
          await revokeAdminInFirestore(targetUid).catch(() => undefined);
          const response = await apiRequest<{ success: boolean; data: AdminUser[] }>('/api/owner/admins');
          setAdmins(response.data || []);
          flash('Rol de administrador revocado en servidor y Firestore.');
          await Promise.all([loadCore(), refreshDbMonitoring()]);
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
            {isOwnerUser ? 'Superusuario · Monitoreo y Soporte' : 'Control del portal'}
          </div>
          <h1 className="font-display text-3xl font-black tracking-tight mt-2">
            {isOwnerUser ? 'Centro de Superusuario Daemon' : 'Panel de administración'}
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            {isOwnerUser
              ? 'Supervisa la base de datos en Firestore, activa o desactiva casillas y gestiona usuarios y soporte.'
              : 'Gestiona usuarios, modera la comunidad y supervisa la seguridad de TakeVault Pro.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
              firestoreStatus.ok
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
            title={firestoreStatus.message || 'Firebase Firestore Cloud Database'}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span
              className={`w-2 h-2 rounded-full ${
                firestoreStatus.ok ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>
              Firebase:{' '}
              {firestoreStatus.loading
                ? 'Comprobando...'
                : firestoreStatus.ok
                ? 'En línea'
                : 'Error'}
            </span>
          </div>
          <RolePill role={currentUser.role} />
          <button
            type="button"
            onClick={() => {
              void loadCore();
              void checkFirestore();
              void refreshDbMonitoring();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || firestoreStatus.loading || loadingDbSnapshot ? 'animate-spin' : ''}`} />
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

            <div className="space-y-4">
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
                    <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'pelicula').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Series</span>
                    <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'serie').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Novelas</span>
                    <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'novela').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Animes</span>
                    <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'anime').length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Documentales</span>
                    <span className="text-slate-200 font-bold">{mediaList.filter((m) => m.type === 'documental').length}</span>
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

              <section className={`${cardClass} p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-sky-400" />
                    <h2 className="font-display text-lg font-black tracking-tight">Sesión de Firebase Auth</h2>
                  </div>
                  <button
                    type="button"
                    onClick={refreshFirebaseDiag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Actualizar
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Estado de la sesión</span>
                    <span className={`inline-flex items-center gap-1.5 font-bold ${firebaseDiag.session.hasSession ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${firebaseDiag.session.hasSession ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {firebaseDiag.session.hasSession ? 'Vinculada' : 'No vinculada'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400 shrink-0">UID Firebase</span>
                    <span className="text-slate-200 font-mono text-[11px] truncate">{firebaseDiag.session.uid || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400 shrink-0">Email</span>
                    <span className="text-slate-200 font-mono text-[11px] truncate">{firebaseDiag.session.email || currentUser?.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Guardados en la nube</span>
                    <span className="text-slate-200 font-bold">
                      {firebaseDiag.writes.successes} ok · {firebaseDiag.writes.failures} fallidos
                    </span>
                  </div>
                </div>

                {!firebaseDiag.session.hasSession && (
                  <>
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                      La sesión se abre sola al iniciar sesión. Si no aparece, el servidor necesita la credencial de servicio de Firebase (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada) guardada como <code className="font-mono">serviceAccountKey.json</code> en la raíz del proyecto, o en la variable <code className="font-mono">FIREBASE_SERVICE_ACCOUNT_JSON</code>.
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLinkFirebase()}
                      disabled={isLinkingFirebase}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors disabled:opacity-50"
                    >
                      <KeyRound className="w-4 h-4" />
                      {isLinkingFirebase ? 'Vinculando...' : 'Vincular sesión de Firebase'}
                    </button>
                  </>
                )}

                {(firebaseLinkError || firebaseDiag.writes.lastError) && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed break-words">
                    <span className="font-bold block mb-0.5">Último problema</span>
                    {firebaseLinkError || firebaseDiag.writes.lastError?.message}
                  </div>
                )}
              </section>

              <section className={`${cardClass} p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-emerald-400" />
                    <h2 className="font-display text-lg font-black tracking-tight">Conexión Firebase Firestore</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void checkFirestore()}
                    disabled={firestoreStatus.loading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${firestoreStatus.loading ? 'animate-spin' : ''}`} />
                    Probar ping
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Estado del servicio</span>
                    <span className={`inline-flex items-center gap-1.5 font-bold ${firestoreStatus.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${firestoreStatus.ok ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                      {firestoreStatus.ok ? 'Conectado en Tiempo Real' : 'Desconectado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Base de datos Cloud</span>
                    <span className="text-slate-200 font-mono text-[11px]">Firestore NoSQL (default)</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Proyecto Firebase</span>
                    <span className="text-emerald-400 font-mono text-[11px] font-bold">screeamlog</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Colección remota</span>
                    <span className="text-slate-200 font-mono text-[11px]">catalog_media</span>
                  </div>
                  {firestoreStatus.latencyMs !== undefined && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                      <span className="text-slate-400">Latencia de respuesta</span>
                      <span className="text-emerald-400 font-mono text-[11px] font-bold">{firestoreStatus.latencyMs} ms</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Títulos en Firestore</span>
                    <span className="text-slate-200 font-bold">{firestoreStatus.docCount} en nube</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-400">Visibilidad</span>
                    <span className="text-amber-400 font-semibold text-[11px]">Exclusivo Administrador</span>
                  </div>
                </div>

                {firestoreStatus.checked && !firestoreStatus.ok && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] leading-relaxed break-words">
                    <span className="font-bold block mb-0.5">Detalle del error</span>
                    {firestoreStatus.message || 'Sin detalle.'}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleSeedFirestore()}
                  disabled={isSeedingFirestore || firestoreStatus.loading}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-colors disabled:opacity-50"
                >
                  <Cloud className={`w-4 h-4 ${isSeedingFirestore ? 'animate-bounce' : ''}`} />
                  {isSeedingFirestore
                    ? 'Subiendo catálogo a Firestore...'
                    : `Subir catálogo actual a Firebase (${mediaList.length} títulos)`}
                </button>

                <div className="pt-2 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Toda película o serie agregada o editada se almacena en Firebase Firestore. Al abrir el sitio desde tu casa, trabajo o móvil, el catálogo se descarga automáticamente de la nube sin perder cambios.
                  </p>
                </div>
              </section>

              <section className={`${cardClass} p-5 space-y-4`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-400" />
                    <h2 className="font-display text-lg font-black tracking-tight">Auditoría e Integridad BD</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void refreshDbMonitoring()}
                    disabled={loadingDbSnapshot}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDbSnapshot ? 'animate-spin' : ''}`} />
                    Auditar BD
                  </button>
                </div>

                {dbSnapshot ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Docs users</span>
                        <span className="text-sm font-bold text-white">{dbSnapshot.totalUsers}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Docs users_public</span>
                        <span className="text-sm font-bold text-white">{dbSnapshot.totalPublicProfiles}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Admins Firestore</span>
                        <span className="text-sm font-bold text-emerald-400">{dbSnapshot.totalAdmins}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                        <span className="text-[10px] text-slate-400 block">Tickets soporte</span>
                        <span className="text-sm font-bold text-sky-400">
                          {Math.max(dbSnapshot.totalSupportTickets, mergedTickets.length)}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-2">
                      <span className="text-slate-400">Listas personales en Daemon</span>
                      <span className={`font-bold ${dbSnapshot.monitorLeakedCount > 0 ? 'text-amber-300' : 'text-emerald-400'}`}>
                        {dbSnapshot.monitorLeakedCount === 0
                          ? '0 (Aislamiento limpio)'
                          : `${dbSnapshot.monitorLeakedCount} infiltrada(s)`}
                      </span>
                    </div>

                    {(dbSnapshot.missingPublicProfiles > 0 || dbSnapshot.missingPrivateInfos > 0) && (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
                        Desincronizaciones detectadas: {dbSnapshot.missingPublicProfiles} sin perfil público ·{' '}
                        {dbSnapshot.missingPrivateInfos} sin private/info.
                      </div>
                    )}

                    {isOwnerUser && (
                      <button
                        type="button"
                        onClick={() => void handleCleanupMonitorLibrary()}
                        disabled={cleaningMonitor}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-200 font-bold text-xs transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {cleaningMonitor
                          ? 'Limpiando lista de Daemon...'
                          : 'Limpiar películas infiltradas en Daemon'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Pulsa «Auditar BD» para consultar el estado en Firestore.</p>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'modules' && (
        <div className="space-y-6">
          <div className={`${cardClass} p-5 space-y-5`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <h2 className="font-display text-lg font-black tracking-tight">
                    Control de Casillas del Sistema (Módulos)
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Activa o desactiva casillas visibles para los usuarios. Se sincroniza en vivo con Firestore (`system_config/portal_settings`).
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setModulesDraft({ ...DEFAULT_PORTAL_MODULES })}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200"
                >
                  Activar todos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setModulesDraft({
                      explorar: true,
                      match: false,
                      miLista: true,
                      estadisticas: false,
                      ruleta: false,
                      asistenteIA: false,
                      addTitle: false,
                      comentarios: true,
                      soporte: true,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200"
                >
                  Solo esenciales
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {MODULE_CHECKBOX_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                    modulesDraft[item.key]
                      ? 'bg-emerald-500/[0.06] border-emerald-500/30'
                      : 'bg-white/[0.02] border-white/10 opacity-75'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(modulesDraft[item.key])}
                    onChange={(e) =>
                      setModulesDraft((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="mt-0.5 rounded accent-rose-600"
                  />
                  <span>
                    <span className="block text-xs font-bold text-white">{item.label}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className={`${cardClass} p-5 space-y-5`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <h2 className="font-display text-lg font-black tracking-tight">
                    Casillas de Calificación y Ficha Personal
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Elige exactamente qué casillas aparecen cuando un usuario clasifica una película o serie.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRatingBoxesDraft({ ...DEFAULT_RATING_BOXES })}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200"
                >
                  Marcar todas
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setRatingBoxesDraft({
                      stars: true,
                      evaluation: true,
                      critique: true,
                      detailedAxes: false,
                      wouldRewatch: false,
                      watchedDate: true,
                      watchPlatform: true,
                      favoriteMoment: false,
                      shortVerdict: false,
                      favoriteCharacter: false,
                      quote: false,
                      recommendation: true,
                      moodRecommendation: false,
                      tags: true,
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200"
                >
                  Calificación rápida
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {RATING_BOX_ITEMS.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                    ratingBoxesDraft[item.key]
                      ? 'bg-rose-500/[0.06] border-rose-500/30'
                      : 'bg-white/[0.02] border-white/10 opacity-75'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(ratingBoxesDraft[item.key])}
                    onChange={(e) =>
                      setRatingBoxesDraft((prev) => ({ ...prev, [item.key]: e.target.checked }))
                    }
                    className="mt-0.5 rounded accent-rose-600"
                  />
                  <span>
                    <span className="block text-xs font-bold text-white">{item.label}</span>
                    <span className="block text-[11px] text-slate-400 mt-0.5 leading-snug">{item.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={savingModules}
                onClick={() => void handleSaveModulesAndBoxes()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-sm font-bold transition-all disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {savingModules ? 'Guardando en Firestore...' : 'Guardar casillas en Firestore'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'support' && (
        <section className={`${cardClass} p-5 space-y-4`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h2 className="font-display text-lg font-black tracking-tight">Bandeja de Soporte y Monitoreo</h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Tickets en tiempo real de Firestore (`support_tickets`) combinados con solicitudes del servidor.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs font-bold">
              {mergedTickets.filter((t) => t.status === 'abierto' || t.status === 'en_revision').length} pendiente(s)
            </span>
          </div>

          <div className="space-y-3">
            {mergedTickets.map((ticket) => {
              const draft = ticketDrafts[ticket.id] || {
                status: ticket.status,
                adminNote: ticket.adminNote || '',
              };
              const statusBadgeClass =
                ticket.status === 'resuelto' || ticket.status === 'cerrado'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : ticket.status === 'en_revision'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

              return (
                <div key={ticket.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{ticket.subject}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadgeClass}`}>
                          {ticket.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 text-slate-300 border border-white/10">
                          Prioridad: {ticket.priority}
                        </span>
                        {ticket.source && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-300 border border-sky-500/20">
                            {ticket.source === 'both' ? 'Firestore + Servidor' : ticket.source}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {ticket.name} ({ticket.email}) · {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-200 bg-[#0A0A0B] border border-white/5 rounded-xl p-3 whitespace-pre-wrap">
                    {ticket.message}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-center">
                    <select
                      value={draft.status}
                      onChange={(e) =>
                        setTicketDrafts((prev) => ({
                          ...prev,
                          [ticket.id]: { ...draft, status: e.target.value as SupportTicketStatus },
                        }))
                      }
                      className={inputClass}
                      aria-label={`Estado de ticket ${ticket.subject}`}
                    >
                      <option value="abierto">Abierto</option>
                      <option value="en_revision">En revisión</option>
                      <option value="resuelto">Resuelto</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                    <input
                      value={draft.adminNote}
                      onChange={(e) =>
                        setTicketDrafts((prev) => ({
                          ...prev,
                          [ticket.id]: { ...draft, adminNote: e.target.value },
                        }))
                      }
                      placeholder="Nota interna / resolución de Daemon..."
                      className={`${inputClass} md:col-span-2`}
                    />
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        disabled={savingTicketId === ticket.id}
                        onClick={() => void handleSaveTicket(ticket)}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {savingTicketId === ticket.id ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteTicket(ticket)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300"
                        title="Eliminar ticket"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {mergedTickets.length === 0 && (
              <EmptyState message="No hay tickets de soporte registrados por el momento." />
            )}
          </div>
        </section>
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
              <option value="novela">Novelas</option>
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
            <button
              type="button"
              onClick={() => setShowCreateUserForm((v) => !v)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-colors md:w-auto"
            >
              <UserPlus className="w-4 h-4" />
              {showCreateUserForm ? 'Cerrar formulario' : 'Nuevo usuario'}
            </button>
            <button
              type="button"
              onClick={() => void handleSyncUsers()}
              disabled={isSyncingUsers}
              className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-colors disabled:opacity-50 md:w-auto"
              title="Recupera en el servidor los usuarios que solo existen en Firestore"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingUsers ? 'animate-spin' : ''}`} />
              {isSyncingUsers ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          </div>

          {showCreateUserForm && (
            <form
              onSubmit={handleCreateUserFromAdmin}
              className="p-4 rounded-2xl bg-[#0A0A0B] border border-rose-500/30 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Crear usuario directo en Firebase Auth + Firestore</h3>
                  <p className="text-[11px] text-slate-400">
                    Provisiona la cuenta en Firebase Authentication, `users/{'{uid}'}`, `users_public/{'{uid}'}`, `private/info` y el servidor sin cerrar tu sesión de Daemon.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                <input
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre completo *"
                  className={inputClass}
                  required
                />
                <input
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, username: e.target.value }))}
                  placeholder="@usuario (opcional)"
                  className={inputClass}
                />
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="correo@ejemplo.com *"
                  className={inputClass}
                  required
                />
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Contraseña (min. 8 caracteres) *"
                  className={inputClass}
                  autoComplete="new-password"
                  required
                />
                <div className="flex gap-2">
                  {isOwnerUser && (
                    <select
                      value={newUserForm.role}
                      onChange={(e) =>
                        setNewUserForm((prev) => ({ ...prev, role: e.target.value as 'user' | 'admin' }))
                      }
                      className={inputClass}
                    >
                      <option value="user">Usuario</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {creatingUser ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <p className="text-[10px] text-slate-500 leading-relaxed">
            El panel lee los usuarios directamente de Firestore. «Sincronizar» vuelve a traerlos y
            restaura en el servidor las cuentas que se hayan perdido al reiniciarse, sin perder
            roles ni bloqueos.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-white/10">
                  <th className="py-2.5 pr-3 font-bold">Usuario</th>
                  <th className="py-2.5 pr-3 font-bold">Rol</th>
                  <th className="py-2.5 pr-3 font-bold">Estado</th>
                  <th className="py-2.5 pr-3 font-bold">Firebase BD</th>
                  <th className="py-2.5 pr-3 font-bold">Sesiones</th>
                  <th className="py-2.5 pr-3 font-bold">Último acceso</th>
                  <th className="py-2.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const dbEntry = dbSnapshot?.users.find(
                    (d) =>
                      d.uid === (user.firebaseUid || user.id) ||
                      (user.email && d.email.toLowerCase() === user.email.toLowerCase()),
                  );
                  return (
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
                    <td className="py-3 pr-3">
                      {dbEntry ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300">
                            <Database className="w-3 h-3" /> Firestore OK
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {dbEntry.classificationsCount} tit. · {dbEntry.hasPublicDoc ? 'público OK' : 'sin público'}
                          </p>
                        </div>
                      ) : user.firebaseUid || user.syncedWithFirebase ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-300">
                          <Cloud className="w-3 h-3" /> Vinculado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300">
                          <AlertTriangle className="w-3 h-3" /> Solo servidor
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
                  );
                })}
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
                  placeholder="TakeVault Pro"
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
              { key: 'emailFrom', label: 'Correo remitente', placeholder: 'hola@takevault.app' },
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
