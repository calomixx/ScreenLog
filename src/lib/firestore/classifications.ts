import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  buildClassificationPayload,
  isMovieStatus,
  normalizeClassificationDoc,
  sanitizeFirestoreId,
  type MovieClassification,
  type MovieClassificationInput,
  type MovieStatus,
} from './schema';

export class FirestoreDataError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly path: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'FirestoreDataError';
  }
}

function requireUid(uid: string): string {
  const safeUid = sanitizeFirestoreId(uid);
  const current = auth.currentUser;
  if (!current) {
    throw new FirestoreDataError(
      'Necesitas iniciar sesión para guardar tu lista.',
      'unauthenticated',
      `users/${safeUid}`,
    );
  }
  if (safeUid !== sanitizeFirestoreId(current.uid)) {
    throw new FirestoreDataError(
      'No puedes modificar la lista de otro usuario.',
      'permission-denied',
      `users/${safeUid}`,
    );
  }
  return safeUid;
}

function wrapError(error: unknown, path: string): never {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: unknown }).code)
      : 'unknown';
  const messages: Record<string, string> = {
    'permission-denied': 'No tienes permiso para realizar esta operación.',
    unauthenticated: 'Inicia sesión para continuar.',
    unavailable: 'Sin conexión con la base de datos. Reintenta en unos segundos.',
    'not-found': 'La película ya no existe en el catálogo.',
    'failed-precondition':
      'Falta un índice en Firestore para esta consulta. Revisa firestore.indexes.json.',
  };
  throw new FirestoreDataError(messages[code] || 'No se pudo completar la operación.', code, path, error);
}

function classificationRef(uid: string, movieId: string) {
  const safeUid = sanitizeFirestoreId(uid);
  const safeMovieId = sanitizeFirestoreId(movieId);
  return doc(db, 'users', safeUid, 'movie_classifications', safeMovieId);
}

function classificationsQuery(uid: string) {
  return collection(db, 'users', sanitizeFirestoreId(uid), 'movie_classifications');
}

function pathFor(uid: string, movieId: string) {
  return `users/${sanitizeFirestoreId(uid)}/movie_classifications/${sanitizeFirestoreId(movieId)}`;
}

/** Obtiene la clasificación de una película (null si el usuario no la ha clasificado). */
export async function getClassification(
  uid: string,
  movieId: string,
): Promise<MovieClassification | null> {
  const safeUid = requireUid(uid);
  const safeMovieId = sanitizeFirestoreId(movieId);
  try {
    const snap = await getDoc(classificationRef(safeUid, safeMovieId));
    if (!snap.exists()) return null;
    return normalizeClassificationDoc(safeMovieId, safeUid, snap.data() as Record<string, unknown>);
  } catch (error) {
    wrapError(error, pathFor(safeUid, safeMovieId));
  }
}

/**
 * Crea o reemplaza la clasificación completa de una película.
 * El ID del documento es el movieId, así que nunca puede haber duplicados.
 */
export async function upsertClassification(
  uid: string,
  movieId: string,
  input: MovieClassificationInput,
): Promise<MovieClassification> {
  const safeUid = requireUid(uid);
  const safeMovieId = sanitizeFirestoreId(movieId);
  const ref = classificationRef(safeUid, safeMovieId);
  try {
    const existing = await getDoc(ref);
    const previous = existing.exists()
      ? normalizeClassificationDoc(safeMovieId, safeUid, existing.data() as Record<string, unknown>)
      : null;
    const payload = buildClassificationPayload(safeMovieId, safeUid, input);
    await setDoc(ref, {
      ...payload,
      createdAt: previous?.createdAt ?? serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const saved = await getDoc(ref);
    return normalizeClassificationDoc(
      safeMovieId,
      safeUid,
      (saved.data() || {}) as Record<string, unknown>,
    );
  } catch (error) {
    wrapError(error, pathFor(safeUid, safeMovieId));
  }
}

/** Actualiza solo los campos indicados, conservando el resto. */
export async function updateClassification(
  uid: string,
  movieId: string,
  patch: MovieClassificationInput,
): Promise<MovieClassification> {
  const current = await getClassification(uid, movieId);
  const merged: MovieClassificationInput = {
    status: patch.status ?? current?.status ?? 'pending',
    isFavorite: patch.isFavorite ?? current?.isFavorite ?? false,
    rating: patch.rating ?? current?.rating ?? 0,
    categories: patch.categories ?? current?.categories ?? [],
    tags: patch.tags ?? current?.tags ?? [],
    notes: patch.notes ?? current?.notes ?? '',
    evaluation: patch.evaluation ?? current?.evaluation ?? '',
    watchedDate: patch.watchedDate ?? current?.watchedDate ?? '',
    platform: patch.platform ?? current?.platform ?? '',
    wouldRewatch: patch.wouldRewatch ?? current?.wouldRewatch ?? 'unset',
    favoriteMoment: patch.favoriteMoment ?? current?.favoriteMoment ?? '',
    shortVerdict: patch.shortVerdict ?? current?.shortVerdict ?? '',
    quote: patch.quote ?? current?.quote ?? '',
    recommendation: patch.recommendation ?? current?.recommendation ?? '',
    moodRecommendation: patch.moodRecommendation ?? current?.moodRecommendation ?? '',
    favoriteCharacter: patch.favoriteCharacter ?? current?.favoriteCharacter ?? '',
    scriptRating: patch.scriptRating ?? current?.scriptRating ?? 0,
    actingRating: patch.actingRating ?? current?.actingRating ?? 0,
    directionRating: patch.directionRating ?? current?.directionRating ?? 0,
    soundtrackRating: patch.soundtrackRating ?? current?.soundtrackRating ?? 0,
    cinematographyRating: patch.cinematographyRating ?? current?.cinematographyRating ?? 0,
    pacingRating: patch.pacingRating ?? current?.pacingRating ?? 0,
    emotionalImpact: patch.emotionalImpact ?? current?.emotionalImpact ?? 0,
  };
  return upsertClassification(uid, movieId, merged);
}

export async function setClassificationStatus(
  uid: string,
  movieId: string,
  status: MovieStatus,
): Promise<MovieClassification> {
  if (!isMovieStatus(status)) {
    throw new FirestoreDataError('Estado no válido.', 'invalid-argument', pathFor(uid, movieId));
  }
  return updateClassification(uid, movieId, { status });
}

export async function setClassificationRating(
  uid: string,
  movieId: string,
  rating: number,
): Promise<MovieClassification> {
  return updateClassification(uid, movieId, { rating });
}

export async function toggleClassificationFavorite(
  uid: string,
  movieId: string,
): Promise<MovieClassification> {
  const current = await getClassification(uid, movieId);
  if (!current) {
    throw new FirestoreDataError(
      'Clasifica la película antes de marcarla como favorita.',
      'not-found',
      pathFor(uid, movieId),
    );
  }
  return updateClassification(uid, movieId, { isFavorite: !current.isFavorite });
}

export async function deleteClassification(uid: string, movieId: string): Promise<void> {
  const safeUid = requireUid(uid);
  const safeMovieId = sanitizeFirestoreId(movieId);
  try {
    await deleteDoc(classificationRef(safeUid, safeMovieId));
  } catch (error) {
    wrapError(error, pathFor(safeUid, safeMovieId));
  }
}

export interface ClassificationFilters {
  status?: MovieStatus;
  favoriteOnly?: boolean;
  category?: string;
  tag?: string;
  minRating?: number;
  limitCount?: number;
  cursor?: QueryDocumentSnapshot | null;
}

export interface ClassificationPage {
  items: MovieClassification[];
  cursor: QueryDocumentSnapshot | null;
}

/** Consulta puntual paginada. Requiere los índices de firestore.indexes.json. */
export async function listClassifications(
  uid: string,
  filters: ClassificationFilters = {},
): Promise<ClassificationPage> {
  const safeUid = requireUid(uid);
  const constraints = [];
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.favoriteOnly) constraints.push(where('isFavorite', '==', true));
  if (filters.category) constraints.push(where('categories', 'array-contains', filters.category));
  if (filters.tag) constraints.push(where('tags', 'array-contains', filters.tag));
  if (typeof filters.minRating === 'number' && filters.minRating > 0) {
    constraints.push(where('rating', '>=', filters.minRating));
  }
  constraints.push(orderBy('updatedAt', 'desc'));
  constraints.push(firestoreLimit(Math.min(100, Math.max(1, filters.limitCount ?? 50))));
  if (filters.cursor) constraints.push(startAfter(filters.cursor));

  try {
    const snap = await getDocs(query(classificationsQuery(safeUid), ...constraints));
    const items: MovieClassification[] = [];
    snap.forEach((docSnap) => {
      items.push(
        normalizeClassificationDoc(docSnap.id, safeUid, docSnap.data() as Record<string, unknown>),
      );
    });
    return {
      items,
      cursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
    };
  } catch (error) {
    wrapError(error, `users/${safeUid}/movie_classifications`);
  }
}

export async function countClassifications(
  uid: string,
  filters: Pick<ClassificationFilters, 'status' | 'favoriteOnly' | 'minRating'> = {},
): Promise<number> {
  const safeUid = requireUid(uid);
  const constraints = [];
  if (filters.status) constraints.push(where('status', '==', filters.status));
  if (filters.favoriteOnly) constraints.push(where('isFavorite', '==', true));
  if (typeof filters.minRating === 'number' && filters.minRating > 0) {
    constraints.push(where('rating', '>=', filters.minRating));
  }
  try {
    const snap = await getCountFromServer(
      query(classificationsQuery(safeUid), ...constraints),
    );
    return snap.data().count;
  } catch (error) {
    wrapError(error, `users/${safeUid}/movie_classifications`);
  }
}

/** Suscripción en tiempo real a toda la biblioteca del usuario. */
export function subscribeToClassifications(
  uid: string,
  onItems: (items: MovieClassification[]) => void,
  onError?: (error: FirestoreDataError) => void,
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  const q = query(classificationsQuery(safeUid), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovieClassification[] = [];
      snapshot.forEach((docSnap) => {
        items.push(
          normalizeClassificationDoc(docSnap.id, safeUid, docSnap.data() as Record<string, unknown>),
        );
      });
      onItems(items);
    },
    (error) => {
      const wrapped = new FirestoreDataError(
        error.code === 'permission-denied'
          ? 'No tienes permiso para leer tu biblioteca.'
          : 'No se pudo sincronizar tu biblioteca en tiempo real.',
        error.code || 'unknown',
        `users/${safeUid}/movie_classifications`,
        error,
      );
      onError?.(wrapped);
    },
  );
}

export function subscribeToFavorites(
  uid: string,
  onItems: (items: MovieClassification[]) => void,
  onError?: (error: FirestoreDataError) => void,
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  const q = query(
    classificationsQuery(safeUid),
    where('isFavorite', '==', true),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovieClassification[] = [];
      snapshot.forEach((docSnap) => {
        items.push(
          normalizeClassificationDoc(docSnap.id, safeUid, docSnap.data() as Record<string, unknown>),
        );
      });
      onItems(items);
    },
    (error) => onError?.(
      new FirestoreDataError('No se pudieron cargar tus favoritos.', error.code || 'unknown', `users/${safeUid}/movie_classifications`, error),
    ),
  );
}

export function subscribeToStatus(
  uid: string,
  status: MovieStatus,
  onItems: (items: MovieClassification[]) => void,
  onError?: (error: FirestoreDataError) => void,
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  const q = query(
    classificationsQuery(safeUid),
    where('status', '==', status),
    orderBy('updatedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items: MovieClassification[] = [];
      snapshot.forEach((docSnap) => {
        items.push(
          normalizeClassificationDoc(docSnap.id, safeUid, docSnap.data() as Record<string, unknown>),
        );
      });
      onItems(items);
    },
    (error) => onError?.(
      new FirestoreDataError('No se pudo cargar la lista solicitada.', error.code || 'unknown', `users/${safeUid}/movie_classifications`, error),
    ),
  );
}
