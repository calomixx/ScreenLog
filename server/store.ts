import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { MediaItem, UserReview } from '../src/types';
import { INITIAL_MEDIA_LIST } from '../src/data/initialMedia';

export type Role = 'owner' | 'admin' | 'user';

export interface StoredUser {
  id: string;
  name: string;
  username?: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: Role;
  avatar: string;
  bio: string;
  favoriteGenres: string[];
  city: string;
  platforms: string[];
  socialLinks: { letterboxd?: string; instagram?: string; twitter?: string };
  customFields: { id: string; label: string; value: string }[];
  blocked: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  failedLoginCount: number;
  lockedUntil: string | null;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  userId: string;
  createdAt: string;
  lastActivityAt: string;
  ip: string;
  userAgent: string;
  remember: boolean;
}

export interface CommunityReviewRecord {
  id: string;
  mediaId: string;
  userId: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
  createdAt: string;
  likes: number;
  likedBy: string[];
  hidden: boolean;
  deleted: boolean;
  moderatedBy?: string;
  moderationReason?: string;
}

export interface LibraryRecord {
  id: string;
  userId: string;
  mediaId: string;
  review: UserReview;
  hidden: boolean;
  updatedAt: string;
}

export interface StoredTestimonial {
  id: string;
  userId?: string | null;
  userName: string;
  userAvatar: string;
  userRole: string;
  rating: number;
  highlightFeature: string;
  content: string;
  dateStr: string;
  likes: number;
  createdAt: string;
}

export interface StoredTicket {
  id: string;
  ticketCode: string;
  userId?: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  urgency: 'normal' | 'alta';
  status: 'open' | 'closed';
  createdAt: string;
}

export interface SystemLogRecord {
  id: string;
  level: 'info' | 'warning' | 'error' | 'security';
  category: 'auth' | 'security' | 'moderation' | 'admin' | 'billing' | 'infrastructure';
  message: string;
  actorId?: string;
  actorName?: string;
  target?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditRecord {
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

export interface PortalSettings {
  portalName: string;
  tagline: string;
  logoUrl: string;
  communityCommentsEnabled: boolean;
  allowPublicRegistration: boolean;
  catalogPerPage: number;
  updatedAt: string;
  updatedBy: string | null;
}

export interface BillingState {
  planName: string;
  planStatus: string;
  stripePublishableKey: string;
  invoices: { id: string; date: string; amount: string; status: string }[];
  updatedAt: string;
}

export interface StoreData {
  version: number;
  users: StoredUser[];
  sessions: SessionRecord[];
  media: MediaItem[];
  library: LibraryRecord[];
  reviews: CommunityReviewRecord[];
  testimonials: StoredTestimonial[];
  tickets: StoredTicket[];
  logs: SystemLogRecord[];
  audit: AuditRecord[];
  settings: PortalSettings;
  secrets: Record<string, string>;
  billing: BillingState;
}

export const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const defaultSettings: PortalSettings = {
  portalName: 'ScreenLog Pro',
  tagline: 'Explora, clasifica y comparte tu pasión por el cine',
  logoUrl: '/favicon.svg',
  communityCommentsEnabled: true,
  allowPublicRegistration: true,
  catalogPerPage: 24,
  updatedAt: new Date().toISOString(),
  updatedBy: null,
};

const defaultBilling: BillingState = {
  planName: 'Sin plan activo',
  planStatus: 'No configurado',
  stripePublishableKey: '',
  invoices: [],
  updatedAt: new Date().toISOString(),
};

function emptyStore(): StoreData {
  return {
    version: 1,
    users: [],
    sessions: [],
    media: [],
    library: [],
    reviews: [],
    testimonials: [],
    tickets: [],
    logs: [],
    audit: [],
    settings: { ...defaultSettings },
    secrets: {},
    billing: { ...defaultBilling },
  };
}

let cache: StoreData | null = null;
let writeChain: Promise<void> = Promise.resolve();

export async function getStore(): Promise<StoreData> {
  if (cache) return cache;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    cache = {
      ...emptyStore(),
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      billing: { ...defaultBilling, ...(parsed.billing || {}) },
      users: parsed.users || [],
      sessions: parsed.sessions || [],
      media: parsed.media || [],
      library: parsed.library || [],
      reviews: parsed.reviews || [],
      testimonials: parsed.testimonials || [],
      tickets: parsed.tickets || [],
      logs: parsed.logs || [],
      audit: parsed.audit || [],
      secrets: parsed.secrets || {},
    };
  } catch {
    cache = emptyStore();
    await persistNow(cache);
  }
  if (cache.media.length === 0) {
    cache.media = JSON.parse(JSON.stringify(INITIAL_MEDIA_LIST)) as MediaItem[];
    await persistNow(cache);
  }
  return cache;
}

async function persistNow(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${STORE_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, STORE_FILE);
}

export async function saveStore(): Promise<void> {
  if (!cache) return;
  const snapshot = cache;
  writeChain = writeChain.then(() => persistNow(snapshot), () => persistNow(snapshot));
  await writeChain;
}

export async function updateStore<T>(mutator: (data: StoreData) => T): Promise<T> {
  const data = await getStore();
  const result = mutator(data);
  await saveStore();
  return result;
}

export function publicUser(user: StoredUser) {
  const defaultUsername = (user.name || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') || user.email.split('@')[0];
  return {
    id: user.id,
    name: user.name,
    username: user.username || defaultUsername,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    bio: user.bio,
    favoriteGenres: user.favoriteGenres,
    city: user.city,
    platforms: user.platforms,
    socialLinks: user.socialLinks,
    customFields: user.customFields,
    blocked: user.blocked,
    mustChangePassword: user.mustChangePassword,
    joinedDate: user.createdAt.slice(0, 10),
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function findUserByEmail(store: StoreData, email: string): StoredUser | undefined {
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email === normalized);
}

export function findUserByIdentifier(store: StoreData, identifier: string): StoredUser | undefined {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return undefined;

  // 1. Exact match on username
  const byUsername = store.users.find((u) => u.username && u.username.toLowerCase() === normalized);
  if (byUsername) return byUsername;

  // 2. Exact match on full email
  const byEmail = store.users.find((u) => u.email.toLowerCase() === normalized);
  if (byEmail) return byEmail;

  // 3. Match on email prefix (e.g. "daemon" for "daemon@screenlog.app")
  const byEmailPrefix = store.users.find((u) => u.email.split('@')[0].toLowerCase() === normalized);
  if (byEmailPrefix) return byEmailPrefix;

  // 4. Match on name normalized (e.g. "deamon" or "CalomixPerceo")
  const byName = store.users.find((u) => {
    const cleanName = (u.name || '').trim().toLowerCase();
    const cleanNoSpaces = cleanName.replace(/[^a-z0-9._-]/g, '');
    return cleanName === normalized || cleanNoSpaces === normalized;
  });
  if (byName) return byName;

  return undefined;
}

export function findUserById(store: StoreData, id: string): StoredUser | undefined {
  return store.users.find((u) => u.id === id);
}

export function ownerExists(store: StoreData): boolean {
  return store.users.some((u) => u.role === 'owner');
}
