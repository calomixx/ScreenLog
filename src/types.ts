export interface CustomUserField {
  id: string;
  label: string;
  value: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  password?: string;
  avatar: string;
  role: 'user' | 'critic' | 'admin';
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
  joinedDate: string;
}

export type MediaType = 'pelicula' | 'serie' | 'anime' | 'documental';

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
