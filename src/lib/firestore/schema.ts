import type { Timestamp } from 'firebase/firestore';
import type { UserReview, WatchStatus } from '../../types';

/**
 * Modelo de datos de Firestore para ScreenLog.
 *
 * Colecciones:
 * - catalog_media/{movieId}                      catálogo compartido (películas/series)
 * - users/{uid}                                  cuenta privada + preferencias
 * - users_public/{uid}                           perfil público (sin PII)
 * - users/{uid}/private/info                     email (PII aislada)
 * - users/{uid}/movie_classifications/{movieId}  clasificación personal (1 doc por película)
 * - users/{uid}/lists/{listId}                   listas personalizadas
 * - users/{uid}/lists/{listId}/items/{movieId}   películas dentro de una lista
 * - user_library/{entryId}                       legado (solo lectura/migración)
 */

export const CLASSIFICATION_SCHEMA_VERSION = 1;

export const MOVIE_STATUSES = ['pending', 'watching', 'watched', 'discarded'] as const;
export type MovieStatus = (typeof MOVIE_STATUSES)[number];

export const REWATCH_INTENTS = ['yes', 'maybe', 'no', 'unset'] as const;
export type RewatchIntent = (typeof REWATCH_INTENTS)[number];

export const RECOMMENDATION_INTENTS = ['yes', 'maybe', 'no', ''] as const;
export type RecommendationIntent = (typeof RECOMMENDATION_INTENTS)[number];

/** Categoría libre elegida por el usuario (p. ej. "Cine negro", "Para repetir"). */
export type ClassificationCategory = string;

export const SUGGESTED_CATEGORIES: readonly ClassificationCategory[] = [
  'Favorita',
  'Para repetir',
  'Cine de autor',
  'Palomitas',
  'Descubrimiento',
  'Decepción',
];

export const CLASSIFICATION_LIMITS = {
  CATEGORY_MAX_COUNT: 10,
  CATEGORY_MAX_LEN: 40,
  TAG_MAX_COUNT: 12,
  TAG_MAX_LEN: 40,
  NOTES_MAX_LEN: 2000,
  EVALUATION_MAX_LEN: 60,
  PLATFORM_MAX_LEN: 80,
  FAVORITE_MOMENT_MAX_LEN: 500,
  SHORT_VERDICT_MAX_LEN: 160,
  QUOTE_MAX_LEN: 500,
  MOOD_MAX_LEN: 200,
  FAVORITE_CHARACTER_MAX_LEN: 120,
  DATE_MAX_LEN: 10,
  NAME_MAX_LEN: 80,
  DESCRIPTION_MAX_LEN: 500,
  PREFERENCE_GENRE_MAX_COUNT: 10,
  MAX_LISTS: 50,
} as const;

/**
 * Documento `users/{uid}/movie_classifications/{movieId}`.
 * El ID del documento ES el movieId: garantiza un único doc por usuario y película.
 */
export interface MovieClassification {
  movieId: string;
  uid: string;
  status: MovieStatus;
  /** Ortogonal al estado: una película vista puede seguir siendo favorita. */
  isFavorite: boolean;
  /** 0 = sin nota, 0.5-5 = valoración personal. */
  rating: number;
  categories: ClassificationCategory[];
  tags: string[];
  notes: string;
  evaluation: string;
  watchedDate: string;
  platform: string;
  wouldRewatch: RewatchIntent;
  favoriteMoment: string;
  shortVerdict: string;
  quote: string;
  recommendation: RecommendationIntent;
  moodRecommendation: string;
  favoriteCharacter: string;
  scriptRating: number;
  actingRating: number;
  directionRating: number;
  soundtrackRating: number;
  cinematographyRating: number;
  pacingRating: number;
  emotionalImpact: number;
  schemaVersion: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Entrada parcial aceptada por los servicios (no incluye uid ni timestamps). */
export type MovieClassificationInput = Partial<
  Omit<MovieClassification, 'movieId' | 'uid' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
>;

export interface UserPreferences {
  theme?: 'dark' | 'light' | 'system';
  language?: 'es' | 'en';
  favoriteGenres?: string[];
  /** Estado por defecto al añadir una película a la biblioteca. */
  defaultStatus?: MovieStatus;
}

/** Documento `users/{uid}`. Solo lo lee el dueño y los administradores. */
export interface UserAccount {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  preferences: UserPreferences;
  /** Marca de migración desde `user_library`/store local; evita re-migrar. */
  legacyLibraryMigratedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Documento `users/{uid}/lists/{listId}`. */
export interface CustomList {
  listId: string;
  uid: string;
  name: string;
  description: string;
  isPublic: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Documento `users/{uid}/lists/{listId}/items/{movieId}`. */
export interface CustomListItem {
  movieId: string;
  addedAt: Timestamp | null;
  /** Orden manual dentro de la lista. */
  position: number;
}

/** Claves permitidas en las reglas (`hasOnly`) para movie_classifications. */
export const CLASSIFICATION_FIELDS = [
  'movieId',
  'uid',
  'status',
  'isFavorite',
  'rating',
  'categories',
  'tags',
  'notes',
  'evaluation',
  'watchedDate',
  'platform',
  'wouldRewatch',
  'favoriteMoment',
  'shortVerdict',
  'quote',
  'recommendation',
  'moodRecommendation',
  'favoriteCharacter',
  'scriptRating',
  'actingRating',
  'directionRating',
  'soundtrackRating',
  'cinematographyRating',
  'pacingRating',
  'emotionalImpact',
  'schemaVersion',
  'createdAt',
  'updatedAt',
] as const;

export const USER_ACCOUNT_FIELDS = [
  'uid',
  'displayName',
  'email',
  'photoURL',
  'preferences',
  'legacyLibraryMigratedAt',
  'createdAt',
  'updatedAt',
] as const;

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export function sanitizeFirestoreId(raw: unknown, fallback = 'item_default'): string {
  const cleaned = String(raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 128);
  return cleaned || fallback;
}

export function isValidFirestoreId(raw: unknown): boolean {
  const value = String(raw ?? '');
  return value.length >= 1 && value.length <= 128 && ID_REGEX.test(value);
}

export function clampString(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, maxLen);
}

export function clampNumber(raw: unknown, min: number, max: number, fallback = 0): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function clampStringList(
  raw: unknown,
  maxCount: number,
  maxLen: number,
): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of raw) {
    const value = clampString(entry, maxLen);
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= maxCount) break;
  }
  return out;
}

export function isMovieStatus(value: unknown): value is MovieStatus {
  return MOVIE_STATUSES.includes(value as MovieStatus);
}

export function isRewatchIntent(value: unknown): value is RewatchIntent {
  return REWATCH_INTENTS.includes(value as RewatchIntent);
}

const UI_TO_DB_STATUS: Record<WatchStatus, MovieStatus> = {
  pendiente: 'pending',
  en_proceso: 'watching',
  terminada: 'watched',
};

const DB_TO_UI_STATUS: Record<MovieStatus, WatchStatus> = {
  pending: 'pendiente',
  watching: 'en_proceso',
  watched: 'terminada',
  // La UI actual no tiene pestaña "descartadas"; se conserva el estado real
  // en `classificationStatus` y se muestra como pendiente por compatibilidad.
  discarded: 'pendiente',
};

export function toDbStatus(status: WatchStatus): MovieStatus {
  return UI_TO_DB_STATUS[status] ?? 'pending';
}

export function toUiStatus(status: MovieStatus): WatchStatus {
  return DB_TO_UI_STATUS[status] ?? 'pendiente';
}

const REWATCH_TO_DB: Record<UserReview['wouldRewatch'], RewatchIntent> = {
  si_totalmente: 'yes',
  quizas: 'maybe',
  no_suficiente: 'no',
  jamas: 'no',
};

const DB_TO_REWATCH: Record<RewatchIntent, UserReview['wouldRewatch']> = {
  yes: 'si_totalmente',
  maybe: 'quizas',
  no: 'no_suficiente',
  unset: 'quizas',
};

/** La UI usa 'si' | 'quizas' | 'no'; Firestore guarda 'yes' | 'maybe' | 'no'. */
type UiRecommendation = NonNullable<UserReview['recommendation']>;

const UI_TO_DB_RECOMMENDATION: Record<UiRecommendation, Exclude<RecommendationIntent, ''>> = {
  si: 'yes',
  quizas: 'maybe',
  no: 'no',
};

const DB_TO_UI_RECOMMENDATION: Record<Exclude<RecommendationIntent, ''>, UiRecommendation> = {
  yes: 'si',
  maybe: 'quizas',
  no: 'no',
};

/** Construye el documento que se escribe en Firestore a partir de un formulario. */
export function buildClassificationPayload(
  movieId: string,
  uid: string,
  input: MovieClassificationInput,
  previousCreatedAt: unknown = null,
): Record<string, unknown> {
  const status = isMovieStatus(input.status) ? input.status : 'pending';
  const wouldRewatch = isRewatchIntent(input.wouldRewatch) ? input.wouldRewatch : 'unset';
  const recommendation = RECOMMENDATION_INTENTS.includes(
    input.recommendation as RecommendationIntent,
  )
    ? (input.recommendation as RecommendationIntent)
    : '';

  return {
    movieId,
    uid,
    status,
    isFavorite: Boolean(input.isFavorite),
    rating: clampNumber(input.rating, 0, 5),
    categories: clampStringList(
      input.categories,
      CLASSIFICATION_LIMITS.CATEGORY_MAX_COUNT,
      CLASSIFICATION_LIMITS.CATEGORY_MAX_LEN,
    ),
    tags: clampStringList(
      input.tags,
      CLASSIFICATION_LIMITS.TAG_MAX_COUNT,
      CLASSIFICATION_LIMITS.TAG_MAX_LEN,
    ),
    notes: clampString(input.notes, CLASSIFICATION_LIMITS.NOTES_MAX_LEN),
    evaluation: clampString(input.evaluation, CLASSIFICATION_LIMITS.EVALUATION_MAX_LEN),
    watchedDate: clampString(input.watchedDate, CLASSIFICATION_LIMITS.DATE_MAX_LEN),
    platform: clampString(input.platform, CLASSIFICATION_LIMITS.PLATFORM_MAX_LEN),
    wouldRewatch,
    favoriteMoment: clampString(
      input.favoriteMoment,
      CLASSIFICATION_LIMITS.FAVORITE_MOMENT_MAX_LEN,
    ),
    shortVerdict: clampString(input.shortVerdict, CLASSIFICATION_LIMITS.SHORT_VERDICT_MAX_LEN),
    quote: clampString(input.quote, CLASSIFICATION_LIMITS.QUOTE_MAX_LEN),
    recommendation,
    moodRecommendation: clampString(input.moodRecommendation, CLASSIFICATION_LIMITS.MOOD_MAX_LEN),
    favoriteCharacter: clampString(
      input.favoriteCharacter,
      CLASSIFICATION_LIMITS.FAVORITE_CHARACTER_MAX_LEN,
    ),
    scriptRating: clampNumber(input.scriptRating, 0, 10),
    actingRating: clampNumber(input.actingRating, 0, 10),
    directionRating: clampNumber(input.directionRating, 0, 10),
    soundtrackRating: clampNumber(input.soundtrackRating, 0, 10),
    cinematographyRating: clampNumber(input.cinematographyRating, 0, 10),
    pacingRating: clampNumber(input.pacingRating, 0, 10),
    emotionalImpact: clampNumber(input.emotionalImpact, 0, 10),
    schemaVersion: CLASSIFICATION_SCHEMA_VERSION,
    createdAt: previousCreatedAt ?? null,
    updatedAt: null,
  };
}

export function normalizeClassificationDoc(
  movieId: string,
  uid: string,
  data: Record<string, unknown> | undefined,
): MovieClassification {
  const status = isMovieStatus(data?.status) ? data!.status : 'pending';
  return {
    movieId,
    uid,
    status,
    isFavorite: Boolean(data?.isFavorite),
    rating: clampNumber(data?.rating, 0, 5),
    categories: clampStringList(
      data?.categories,
      CLASSIFICATION_LIMITS.CATEGORY_MAX_COUNT,
      CLASSIFICATION_LIMITS.CATEGORY_MAX_LEN,
    ),
    tags: clampStringList(
      data?.tags,
      CLASSIFICATION_LIMITS.TAG_MAX_COUNT,
      CLASSIFICATION_LIMITS.TAG_MAX_LEN,
    ),
    notes: clampString(data?.notes, CLASSIFICATION_LIMITS.NOTES_MAX_LEN),
    evaluation: clampString(data?.evaluation, CLASSIFICATION_LIMITS.EVALUATION_MAX_LEN),
    watchedDate: clampString(data?.watchedDate, CLASSIFICATION_LIMITS.DATE_MAX_LEN),
    platform: clampString(data?.platform, CLASSIFICATION_LIMITS.PLATFORM_MAX_LEN),
    wouldRewatch: isRewatchIntent(data?.wouldRewatch) ? data!.wouldRewatch : 'unset',
    favoriteMoment: clampString(
      data?.favoriteMoment,
      CLASSIFICATION_LIMITS.FAVORITE_MOMENT_MAX_LEN,
    ),
    shortVerdict: clampString(data?.shortVerdict, CLASSIFICATION_LIMITS.SHORT_VERDICT_MAX_LEN),
    quote: clampString(data?.quote, CLASSIFICATION_LIMITS.QUOTE_MAX_LEN),
    recommendation: RECOMMENDATION_INTENTS.includes(
      data?.recommendation as RecommendationIntent,
    )
      ? (data!.recommendation as RecommendationIntent)
      : '',
    moodRecommendation: clampString(data?.moodRecommendation, CLASSIFICATION_LIMITS.MOOD_MAX_LEN),
    favoriteCharacter: clampString(
      data?.favoriteCharacter,
      CLASSIFICATION_LIMITS.FAVORITE_CHARACTER_MAX_LEN,
    ),
    scriptRating: clampNumber(data?.scriptRating, 0, 10),
    actingRating: clampNumber(data?.actingRating, 0, 10),
    directionRating: clampNumber(data?.directionRating, 0, 10),
    soundtrackRating: clampNumber(data?.soundtrackRating, 0, 10),
    cinematographyRating: clampNumber(data?.cinematographyRating, 0, 10),
    pacingRating: clampNumber(data?.pacingRating, 0, 10),
    emotionalImpact: clampNumber(data?.emotionalImpact, 0, 10),
    schemaVersion: Number(data?.schemaVersion) || CLASSIFICATION_SCHEMA_VERSION,
    createdAt: (data?.createdAt as Timestamp) ?? null,
    updatedAt: (data?.updatedAt as Timestamp) ?? null,
  };
}

/**
 * Convierte la clasificación persistida al modelo de UI. Rellena los campos
 * de la película con los datos que ya tenga el catálogo en memoria.
 */
export function classificationToUserReview(
  classification: MovieClassification,
  media?: { year?: number; genres?: string[]; director?: string },
): UserReview {
  return {
    mediaId: classification.movieId,
    status: toUiStatus(classification.status),
    classificationStatus: classification.status,
    isFavorite: classification.isFavorite,
    stars: classification.rating,
    year: media?.year ?? new Date().getFullYear(),
    genres: media?.genres?.length ? media.genres : ['Drama'],
    evaluation: classification.evaluation || '',
    critique: classification.notes,
    director: media?.director ?? '',
    watchedDate: classification.watchedDate,
    platform: classification.platform,
    wouldRewatch: DB_TO_REWATCH[classification.wouldRewatch],
    favoriteMoment: classification.favoriteMoment || undefined,
    scriptRating: classification.scriptRating || undefined,
    actingRating: classification.actingRating || undefined,
    directionRating: classification.directionRating || undefined,
    soundtrackRating: classification.soundtrackRating || undefined,
    cinematographyRating: classification.cinematographyRating || undefined,
    pacingRating: classification.pacingRating || undefined,
    emotionalImpact: classification.emotionalImpact || undefined,
    shortVerdict: classification.shortVerdict || undefined,
    favoriteCharacter: classification.favoriteCharacter || undefined,
    quote: classification.quote || undefined,
    recommendation: classification.recommendation
      ? DB_TO_UI_RECOMMENDATION[classification.recommendation]
      : undefined,
    moodRecommendation: classification.moodRecommendation || undefined,
    tags: classification.tags,
    updatedAt: classification.updatedAt
      ? classification.updatedAt.toDate().toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}

/** Convierte el formulario de la app en una entrada de clasificación. */
export function userReviewToClassificationInput(
  review: UserReview,
  previous?: MovieClassification | null,
): MovieClassificationInput {
  const status =
    (review.classificationStatus && isMovieStatus(review.classificationStatus)
      ? review.classificationStatus
      : undefined) ?? toDbStatus(review.status);

  const fallbackFavorite = previous ? previous.isFavorite : review.stars >= 4;

  return {
    status,
    isFavorite: review.isFavorite ?? fallbackFavorite,
    rating: clampNumber(review.stars, 0, 5),
    categories: previous?.categories ?? [],
    tags: review.tags
      ? clampStringList(review.tags, CLASSIFICATION_LIMITS.TAG_MAX_COUNT, CLASSIFICATION_LIMITS.TAG_MAX_LEN)
      : previous?.tags ?? [],
    notes: clampString(review.critique, CLASSIFICATION_LIMITS.NOTES_MAX_LEN),
    evaluation: clampString(review.evaluation, CLASSIFICATION_LIMITS.EVALUATION_MAX_LEN),
    watchedDate: clampString(review.watchedDate, CLASSIFICATION_LIMITS.DATE_MAX_LEN),
    platform: clampString(review.platform, CLASSIFICATION_LIMITS.PLATFORM_MAX_LEN),
    wouldRewatch: REWATCH_TO_DB[review.wouldRewatch] ?? 'unset',
    favoriteMoment: clampString(
      review.favoriteMoment,
      CLASSIFICATION_LIMITS.FAVORITE_MOMENT_MAX_LEN,
    ),
    shortVerdict: clampString(review.shortVerdict, CLASSIFICATION_LIMITS.SHORT_VERDICT_MAX_LEN),
    quote: clampString(review.quote, CLASSIFICATION_LIMITS.QUOTE_MAX_LEN),
    recommendation: review.recommendation
      ? UI_TO_DB_RECOMMENDATION[review.recommendation]
      : '',
    moodRecommendation: clampString(
      review.moodRecommendation,
      CLASSIFICATION_LIMITS.MOOD_MAX_LEN,
    ),
    favoriteCharacter: clampString(
      review.favoriteCharacter,
      CLASSIFICATION_LIMITS.FAVORITE_CHARACTER_MAX_LEN,
    ),
    scriptRating: clampNumber(review.scriptRating, 0, 10),
    actingRating: clampNumber(review.actingRating, 0, 10),
    directionRating: clampNumber(review.directionRating, 0, 10),
    soundtrackRating: clampNumber(review.soundtrackRating, 0, 10),
    cinematographyRating: clampNumber(review.cinematographyRating, 0, 10),
    pacingRating: clampNumber(review.pacingRating, 0, 10),
    emotionalImpact: clampNumber(review.emotionalImpact, 0, 10),
  };
}
