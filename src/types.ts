export interface CustomUserField {
  id: string;
  label: string;
  value: string;
}

export type Role = 'owner' | 'admin' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar: string;
  role: Role;
  favoriteGenres?: string[];
  bio?: string;
  city?: string;
  platforms?: string[];
  socialLinks?: {
    letterboxd?: string;
    instagram?: string;
    twitter?: string;
  };
  customFields?: CustomUserField[];
  blocked?: boolean;
  mustChangePassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
  joinedDate: string;
  monitorOnly?: boolean;
  firebaseUid?: string | null;
  syncedWithFirebase?: boolean;
}

export type MediaType = 'pelicula' | 'serie' | 'anime' | 'documental' | 'novela';

export type WatchStatus = 'pendiente' | 'en_proceso' | 'terminada';

export type RewatchChoice = 'si_totalmente' | 'quizas' | 'no_suficiente' | 'jamas';

export type EvaluationTag = 
  | 'Obra Maestra (10/10)'
  | 'Excelente (9/10)'
  | 'Muy Buena (8/10)'
  | 'Buena (7/10)'
  | 'Entretenida (6/10)'
  | 'Pasable / Regular (5/10)'
  | 'Mediocre (4/10)'
  | 'Mala (2-3/10)'
  | 'Pérdida de tiempo (1/10)';

export interface UserReview {
  id?: string;
  mediaId: string;
  status: WatchStatus;
  /** Estado persistido en Firestore (incluye 'discarded', que la UI aún no filtra). */
  classificationStatus?: 'pending' | 'watching' | 'watched' | 'discarded';
  isFavorite?: boolean;
  // Requested specific fields for "Terminada"
  stars: number; // 1 to 5 (or half stars like 4.5)
  year: number;
  genres: string[];
  evaluation: EvaluationTag | string;
  critique: string; // Crítica / Opinión
  director: string;
  watchedDate: string; // Fecha en que la vi (YYYY-MM-DD)
  platform: string; // Dónde la vi (Netflix, HBO Max, Prime Video, Disney+, etc.)
  wouldRewatch: RewatchChoice; // ¿La volvería a ver?
  favoriteMoment?: string;

  // Nuevos campos detallados para calificar
  scriptRating?: number; // Guión & Narrativa (1-10)
  actingRating?: number; // Actuaciones & Elenco (1-10)
  directionRating?: number; // Dirección & Estilo (1-10)
  soundtrackRating?: number; // Banda Sonora & Audio (1-10)
  cinematographyRating?: number; // Fotografía & Visuales (1-10)
  pacingRating?: number; // Ritmo & Montaje (1-10)
  emotionalImpact?: number; // Impacto Emocional & Clímax (1-10)
  shortVerdict?: string; // Veredicto en pocas palabras / Frase resumen
  favoriteCharacter?: string; // Personaje o actuación favorita
  quote?: string; // Frase o diálogo memorable
  recommendation?: 'si' | 'quizas' | 'no'; // ¿La recomiendas a tus amigos?
  moodRecommendation?: string; // Momento ideal para verla (p.ej. noche con amigos, para reflexionar)
  tags?: string[]; // Etiquetas de sensaciones cinéfilas (p.ej. giro inesperado, visualmente hipnótica)

  updatedAt: string;
}

export interface CommunityComment {
  id: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
  date: string;
  likes: number;
  isUserLiked?: boolean;
}

export interface DetailedCommunityVotes {
  script: number; // 1-10
  acting: number; // 1-10
  soundtrack: number; // 1-10
  visuals: number; // 1-10
  direction: number; // 1-10
  pacing?: number; // 1-10
  emotionalImpact?: number; // 1-10
  totalVotes: number;
  ratingDistribution: Record<number, number>; // 1: count, 2: count, etc.
}

export type WatchProviderType = 'suscripcion' | 'alquiler' | 'compra' | 'gratis' | 'cines';
export type WatchProviderQuality = 'SD' | 'HD' | '4K';

export interface WatchProvider {
  name: string; // "Netflix", "Max", "Prime Video", "Disney+", "Apple TV+", "Cine", "YouTube Movies"...
  logoUrl?: string;
  type: WatchProviderType;
  quality?: WatchProviderQuality;
  price?: string; // "3,99 €", "$59 MXN", etc.
  url: string; // enlace oficial
  region: string; // "ES", "MX", "AR", "CO", "CL", "US"...
  seasons?: string; // e.g. "Temporadas 1-4" o "Temporada 1"
}

export interface MediaItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  year: number;
  genres: string[];
  director: string;
  cast: string[];
  synopsis: string;
  duration?: string; // e.g. "2h 49m" or "3 Temporadas (24 eps)"
  posterUrl: string;
  backdropUrl: string;
  trailerYoutubeId?: string;
  defaultPlatform: string;
  streamingPlatforms?: string[];
  communityRating: number; // 0 to 5 or 0 to 10
  communityVotesCount: number;
  addedToListCount: number;
  detailedVotes: DetailedCommunityVotes;
  comments: CommunityComment[];
  isFeatured?: boolean;
  isTrending?: boolean;
  isTopClassified?: boolean;
  createdAt: string;
  isCustomUserCreated?: boolean;
  createdByUserId?: string;
  watchProviders?: WatchProvider[];
  seasonsCount?: number;
  episodesCount?: number;
  releaseDate?: string;
  country?: string;
  language?: string;
  ageRating?: string;
  status?: 'En emisión' | 'Finalizada' | 'Película';
  tags?: string[];
  customFields?: CustomUserField[];
  lastEditedBy?: string;
  lastEditedAt?: string;
  editHistory?: {
    id: string;
    timestamp: string;
    user: string;
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}

export interface OfflineSyncAction {
  id: string;
  type: 'save_list_entry' | 'delete_list_entry' | 'create_media' | 'create_review';
  payload: any;
  timestamp: string;
}

export interface LocalBackupData {
  version: string;
  exportedAt: string;
  currentUser?: UserProfile | null;
  mediaList: MediaItem[];
  userReviews: Record<string, UserReview>;
}

export interface CineMatchItem {
  id: string;
  title: string;
  originalTitle?: string;
  type: MediaType;
  year: number;
  director: string;
  genres: string[];
  synopsis: string;
  duration?: string;
  posterUrl: string;
  backdropUrl: string;
  trailerYoutubeId?: string;
  defaultPlatform: string;
  communityRating: number;
  matchPercentage: number;
  matchReason: string;
  vibeTag: string;
}

export interface CineMatchAestheticAnalysis {
  title: string;
  palette: string[];
  summary: string;
  keywords: string[];
}

export interface CineMatchResponse {
  success: boolean;
  mode: 'visual' | 'preset' | 'vibe' | 'favorites';
  aestheticAnalysis: CineMatchAestheticAnalysis;
  recommendations: CineMatchItem[];
  message?: string;
}

export interface PortalModulesConfig {
  explorar: boolean;
  match: boolean;
  miLista: boolean;
  estadisticas: boolean;
  ruleta: boolean;
  asistenteIA: boolean;
  addTitle: boolean;
  comentarios: boolean;
  soporte: boolean;
}

export interface RatingBoxesConfig {
  stars: boolean;
  evaluation: boolean;
  critique: boolean;
  detailedAxes: boolean;
  wouldRewatch: boolean;
  watchedDate: boolean;
  watchPlatform: boolean;
  favoriteMoment: boolean;
  shortVerdict: boolean;
  favoriteCharacter: boolean;
  quote: boolean;
  recommendation: boolean;
  moodRecommendation: boolean;
  tags: boolean;
}

export interface SystemPortalSettings {
  portalName: string;
  tagline: string;
  logoUrl?: string;
  allowPublicRegistration: boolean;
  communityCommentsEnabled: boolean;
  catalogPerPage?: number;
  modules: PortalModulesConfig;
  ratingBoxes: RatingBoxesConfig;
  monitorModeEnforced?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export type SupportTicketStatus = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado';
export type SupportTicketPriority = 'baja' | 'media' | 'alta';

export interface SupportTicket {
  id: string;
  userId: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  adminNote?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
  source?: 'firestore' | 'server' | 'both';
}

export const DEFAULT_PORTAL_MODULES: PortalModulesConfig = {
  explorar: true,
  match: true,
  miLista: true,
  estadisticas: true,
  ruleta: true,
  asistenteIA: true,
  addTitle: true,
  comentarios: true,
  soporte: true,
};

export const DEFAULT_RATING_BOXES: RatingBoxesConfig = {
  stars: true,
  evaluation: true,
  critique: true,
  detailedAxes: true,
  wouldRewatch: true,
  watchedDate: true,
  watchPlatform: true,
  favoriteMoment: true,
  shortVerdict: true,
  favoriteCharacter: true,
  quote: true,
  recommendation: true,
  moodRecommendation: true,
  tags: true,
};

export function mergePortalModules(input?: Partial<PortalModulesConfig> | null): PortalModulesConfig {
  return {
    ...DEFAULT_PORTAL_MODULES,
    ...(input || {}),
  };
}

export function mergeRatingBoxes(input?: Partial<RatingBoxesConfig> | null): RatingBoxesConfig {
  return {
    ...DEFAULT_RATING_BOXES,
    ...(input || {}),
  };
}

export function isSystemMonitorUser(
  user?: Pick<UserProfile, 'role' | 'email' | 'monitorOnly' | 'id'> | null,
): boolean {
  if (!user) return false;
  const normalizedEmail = String(user.email || '').trim().toLowerCase();
  return (
    user.role === 'owner' ||
    Boolean(user.monitorOnly) ||
    normalizedEmail === 'daemon@screenlog.app' ||
    normalizedEmail === 'daemon@takevault.app' ||
    user.id === 'usr_daemon_owner'
  );
}
