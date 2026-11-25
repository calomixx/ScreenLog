import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { UserReview } from '../../types';
import {
  buildClassificationPayload,
  clampNumber,
  clampString,
  sanitizeFirestoreId,
  userReviewToClassificationInput,
  type MovieClassification,
} from './schema';
import { markLegacyLibraryMigrated } from './users';
import type { MediaLookup } from './libraryBridge';

export interface MigrationResult {
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
}

const BATCH_SIZE = 400;

function emptyResult(): MigrationResult {
  return { total: 0, migrated: 0, skipped: 0, failed: 0 };
}

function addResults(target: MigrationResult, partial: MigrationResult): void {
  target.total += partial.total;
  target.migrated += partial.migrated;
  target.skipped += partial.skipped;
  target.failed += partial.failed;
}

/** Convierte un documento legado de `user_library` al modelo de UI. */
export function legacyLibraryDocToReview(data: Record<string, unknown>): UserReview | null {
  const mediaId = sanitizeFirestoreId(data.mediaId, '');
  if (!mediaId) return null;
  const status = ['pendiente', 'en_proceso', 'terminada'].includes(String(data.status))
    ? (data.status as UserReview['status'])
    : 'pendiente';
  const stars = clampNumber(data.personalRating, 0, 5);
  const rewatchMap: Record<string, UserReview['wouldRewatch']> = {
    si: 'si_totalmente',
    tal_vez: 'quizas',
    no: 'no_suficiente',
  };
  return {
    mediaId,
    status,
    stars,
    year: new Date().getFullYear(),
    genres: [],
    evaluation: '',
    critique: clampString(data.personalComment, 2000),
    director: '',
    watchedDate: '',
    platform: '',
    wouldRewatch: rewatchMap[String(data.rewatch)] || 'quizas',
    isFavorite: Boolean(data.liked) || stars >= 4,
    tags: [],
    updatedAt: new Date().toISOString().slice(0, 10),
  };
}

async function existingClassifications(
  uid: string,
): Promise<Map<string, MovieClassification['createdAt']>> {
  const snap = await getDocs(collection(db, 'users', sanitizeFirestoreId(uid), 'movie_classifications'));
  const map = new Map<string, MovieClassification['createdAt']>();
  snap.forEach((docSnap) => {
    const createdAt = (docSnap.data().createdAt as MovieClassification['createdAt']) ?? null;
    map.set(docSnap.id, createdAt);
  });
  return map;
}

/**
 * Migra un conjunto de reseñas (del store local del servidor o de la
 * colección legada) a `users/{uid}/movie_classifications/{movieId}`.
 * Es idempotente y por defecto no sobrescribe clasificaciones ya existentes.
 */
export async function migrateReviewsToFirestore(
  uid: string,
  reviews: UserReview[],
  mediaLookup?: MediaLookup,
  options: { onlyMissing?: boolean } = {},
): Promise<MigrationResult> {
  const result = emptyResult();
  const safeUid = sanitizeFirestoreId(uid);
  if (!safeUid || !Array.isArray(reviews) || reviews.length === 0) return result;

  const onlyMissing = options.onlyMissing !== false;
  const existing = onlyMissing
    ? await existingClassifications(safeUid)
    : new Map<string, MovieClassification['createdAt']>();

  let batch = writeBatch(db);
  let pending = 0;

  const flush = async () => {
    if (pending === 0) return;
    try {
      await batch.commit();
      result.migrated += pending;
    } catch (error) {
      console.warn(`Migración de ${safeUid}: fallo al confirmar lote`, error);
      result.failed += pending;
    }
    batch = writeBatch(db);
    pending = 0;
  };

  for (const review of reviews) {
    const movieId = sanitizeFirestoreId(review.mediaId, '');
    if (!movieId) continue;
    result.total += 1;
    if (onlyMissing && existing.has(movieId)) {
      result.skipped += 1;
      continue;
    }

    try {
      const input = userReviewToClassificationInput(review, null);
      const payload = buildClassificationPayload(movieId, safeUid, input);
      const previous = existing.get(movieId);
      batch.set(doc(db, 'users', safeUid, 'movie_classifications', movieId), {
        ...payload,
        createdAt: previous ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      pending += 1;
      if (pending >= BATCH_SIZE) await flush();
    } catch (error) {
      console.warn(`No se pudo preparar ${movieId} para migración`, error);
      result.failed += 1;
    }
  }

  await flush();
  return result;
}

/** Migra la colección legada `user_library` del usuario actual. */
export async function migrateLegacyLibraryForUser(uid: string): Promise<MigrationResult> {
  const safeUid = sanitizeFirestoreId(uid);
  const snap = await getDocs(
    query(collection(db, 'user_library'), where('userId', '==', safeUid)),
  );
  const reviews: UserReview[] = [];
  snap.forEach((docSnap) => {
    const review = legacyLibraryDocToReview(docSnap.data() as Record<string, unknown>);
    if (review) reviews.push(review);
  });
  const result = await migrateReviewsToFirestore(safeUid, reviews, undefined, {
    onlyMissing: true,
  });
  result.skipped += snap.size - reviews.length;
  return result;
}

/**
 * Migración global (solo administradores con permiso de listado sobre
 * `user_library` y escritura sobre las subcolecciones de cada usuario).
 */
export async function migrateAllLegacyLibraries(): Promise<MigrationResult> {
  const total = emptyResult();
  const snap = await getDocs(collection(db, 'user_library'));

  const byUser = new Map<string, UserReview[]>();
  snap.forEach((docSnap) => {
    const data = docSnap.data() as Record<string, unknown>;
    const uid = sanitizeFirestoreId(data.userId, '');
    if (!uid) return;
    const review = legacyLibraryDocToReview(data);
    if (!review) return;
    const list = byUser.get(uid) || [];
    list.push(review);
    byUser.set(uid, list);
  });

  for (const [uid, reviews] of byUser) {
    const partial = await migrateReviewsToFirestore(uid, reviews, undefined, {
      onlyMissing: true,
    });
    addResults(total, partial);
  }

  return total;
}

/**
 * Migración automática al iniciar sesión: sube al usuario su biblioteca
 * guardada en el servidor (store.json) si aún no se ha migrado.
 * Usa un marcador en `users/{uid}` para no repetir el trabajo.
 */
export async function maybeMigrateServerLibrary(
  uid: string,
  reviews: UserReview[],
  mediaLookup?: MediaLookup,
): Promise<MigrationResult | null> {
  const safeUid = sanitizeFirestoreId(uid);
  const accountSnap = await getDoc(doc(db, 'users', safeUid));
  if (accountSnap.exists() && accountSnap.data()?.legacyLibraryMigratedAt) {
    return null;
  }

  const result = await migrateReviewsToFirestore(safeUid, reviews, mediaLookup, {
    onlyMissing: true,
  });
  try {
    await markLegacyLibraryMigrated(safeUid);
  } catch (error) {
    console.warn('No se pudo marcar la migración de biblioteca:', error);
  }
  return result;
}
