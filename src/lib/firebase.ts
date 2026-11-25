import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { MediaItem, UserProfile } from '../types';

const app = initializeApp(firebaseConfig);
export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Blueprint validation constants (mirrored from firebase-blueprint.json)
export const BLUEPRINT_LIMITS = {
  ID_REGEX: /^[a-zA-Z0-9_\-]+$/,
  ID_MAX_LEN: 128,
  NAME_MAX_LEN: 80,
  USERNAME_MAX_LEN: 40,
  AVATAR_MAX_LEN: 1000,
  BIO_MAX_LEN: 500,
  CITY_MAX_LEN: 120,
  EMAIL_MAX_LEN: 254,
  COMMENT_MAX_LEN: 2000,
  TITLE_MAX_LEN: 200,
  DIRECTOR_MAX_LEN: 120,
  SYNOPSIS_MAX_LEN: 2000,
  DURATION_MAX_LEN: 60,
  PLATFORM_MAX_LEN: 80,
  MAX_ARRAY_ITEMS: 10,
  GENRE_MAX_LEN: 40,
} as const;

export function sanitizeFirestoreId(raw: string): string {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, BLUEPRINT_LIMITS.ID_MAX_LEN);
  return cleaned || 'item_default';
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const str = typeof val === 'string' ? val.trim() : '';
  if (!str) return fallback;
  return str.slice(0, maxLen);
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

/**
 * Atomically syncs the authenticated Firebase user's public profile and isolated private PII.
 */
export async function syncFirebaseUserProfile(
  fbUser: FirebaseUser,
  overrides?: Partial<UserProfile>,
): Promise<void> {
  if (!fbUser?.uid || !fbUser.emailVerified) return;
  const uid = sanitizeFirestoreId(fbUser.uid);
  if (!BLUEPRINT_LIMITS.ID_REGEX.test(uid)) return;

  const publicPath = `users_public/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  const displayName = clampString(
    overrides?.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Cinéfilo',
    BLUEPRINT_LIMITS.NAME_MAX_LEN,
    'Cinéfilo',
  );
  const rawUsername = overrides?.username || displayName.toLowerCase().replace(/[^a-z0-9._-]/g, '');
  const username = clampString(rawUsername || 'usuario', BLUEPRINT_LIMITS.USERNAME_MAX_LEN, 'usuario');
  const rawAvatar = overrides?.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  const avatar = rawAvatar.startsWith('data:')
    ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    : clampString(rawAvatar, BLUEPRINT_LIMITS.AVATAR_MAX_LEN, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
  const bio = clampString(overrides?.bio ?? '', BLUEPRINT_LIMITS.BIO_MAX_LEN, '');
  const city = clampString(overrides?.city ?? '', BLUEPRINT_LIMITS.CITY_MAX_LEN, '');
  const favoriteGenres = Array.isArray(overrides?.favoriteGenres)
    ? overrides!.favoriteGenres
        .filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
        .map((g) => g.trim().slice(0, BLUEPRINT_LIMITS.GENRE_MAX_LEN))
        .slice(0, BLUEPRINT_LIMITS.MAX_ARRAY_ITEMS)
    : ['Ciencia Ficción', 'Drama'];

  try {
    const privateRef = doc(db, 'users', uid, 'private', 'info');
    let existingPrivateSnap;
    try {
      existingPrivateSnap = await getDoc(privateRef);
    } catch {
      existingPrivateSnap = null;
    }

    const batch = writeBatch(db);
    const publicRef = doc(db, 'users_public', uid);

    batch.set(publicRef, {
      userId: uid,
      name: displayName,
      username,
      avatar,
      bio,
      city,
      favoriteGenres,
      updatedAt: serverTimestamp(),
    });

    const email = clampString(fbUser.email || 'user@takevault.app', BLUEPRINT_LIMITS.EMAIL_MAX_LEN, 'user@takevault.app');
    if (existingPrivateSnap && existingPrivateSnap.exists()) {
      const existingData = existingPrivateSnap.data();
      batch.set(privateRef, {
        userId: uid,
        email,
        role: existingData.role || 'user',
        blocked: existingData.blocked || false,
        createdAt: existingData.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } else {
      batch.set(privateRef, {
        userId: uid,
        email,
        role: 'user',
        blocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${publicPath} & ${privatePath}`);
  }
}

/**
 * Publishes a community review to Firestore.
 */
export async function publishCommunityReviewToFirestore(params: {
  id: string;
  mediaId: string;
  author: string;
  avatar: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid || !fbUser.emailVerified) return;

  const uid = sanitizeFirestoreId(fbUser.uid);
  const reviewId = sanitizeFirestoreId(params.id);
  const mediaId = sanitizeFirestoreId(params.mediaId);
  const path = `community_reviews/${reviewId}`;

  const author = clampString(params.author || fbUser.displayName || 'Cinéfilo', BLUEPRINT_LIMITS.NAME_MAX_LEN, 'Cinéfilo');
  const rawAvatar = params.avatar || fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
  const avatar = rawAvatar.startsWith('data:')
    ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
    : clampString(rawAvatar, BLUEPRINT_LIMITS.AVATAR_MAX_LEN, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
  const rating = Math.max(1, Math.min(5, Math.round(Number(params.rating) || 5)));
  const comment = clampString(params.comment, BLUEPRINT_LIMITS.COMMENT_MAX_LEN, 'Excelente producción.');

  try {
    await setDoc(doc(db, 'community_reviews', reviewId), {
      userId: uid,
      mediaId,
      author,
      avatar,
      rating,
      comment,
      likes: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Saves or updates a custom/curated catalog media item in Firestore.
 */
export async function saveCatalogMediaToFirestore(item: MediaItem): Promise<void> {
  const fbUser = auth.currentUser;
  const uid = fbUser?.uid ? sanitizeFirestoreId(fbUser.uid) : 'takevault_admin';
  const mediaId = sanitizeFirestoreId(item.id);
  const path = `catalog_media/${mediaId}`;

  const title = clampString(item.title, BLUEPRINT_LIMITS.TITLE_MAX_LEN, 'Sin título');
  const type = ['pelicula', 'serie', 'anime', 'documental', 'novela'].includes(item.type) ? item.type : 'pelicula';
  const year = Math.max(1888, Math.min(2100, Math.round(Number(item.year) || new Date().getFullYear())));
  const director = clampString(item.director, BLUEPRINT_LIMITS.DIRECTOR_MAX_LEN, 'Desconocido');
  const synopsis = clampString(item.synopsis, BLUEPRINT_LIMITS.SYNOPSIS_MAX_LEN, 'Sin sinopsis disponible.');
  const posterUrl = item.posterUrl?.startsWith('data:')
    ? 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80'
    : clampString(item.posterUrl, BLUEPRINT_LIMITS.AVATAR_MAX_LEN, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80');
  const backdropUrl = item.backdropUrl?.startsWith('data:')
    ? posterUrl
    : clampString(item.backdropUrl || posterUrl, BLUEPRINT_LIMITS.AVATAR_MAX_LEN, posterUrl);
  const duration = clampString(item.duration, BLUEPRINT_LIMITS.DURATION_MAX_LEN, '2h 00m');
  const defaultPlatform = clampString(item.defaultPlatform, BLUEPRINT_LIMITS.PLATFORM_MAX_LEN, 'Cine / Sala');
  const genres = Array.isArray(item.genres) && item.genres.length > 0
    ? item.genres
        .filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
        .map((g) => g.trim().slice(0, BLUEPRINT_LIMITS.GENRE_MAX_LEN))
        .slice(0, BLUEPRINT_LIMITS.MAX_ARRAY_ITEMS)
    : ['Drama'];

  const cast = Array.isArray(item.cast)
    ? item.cast
        .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 80))
        .slice(0, 15)
    : [];

  const trailerYoutubeId = clampString(item.trailerYoutubeId || '', 120, '');

  const payload: Record<string, unknown> = {
    title,
    type,
    year,
    director,
    synopsis,
    posterUrl,
    backdropUrl,
    duration,
    defaultPlatform,
    genres,
    cast,
    trailerYoutubeId,
    communityRating: Number(item.communityRating) || 0,
    communityVotesCount: Number(item.communityVotesCount) || 0,
    addedToListCount: Number(item.addedToListCount) || 0,
    isFeatured: Boolean(item.isFeatured),
    isTrending: Boolean(item.isTrending),
    isTopClassified: Boolean(item.isTopClassified),
    isCustomUserCreated: Boolean(item.isCustomUserCreated),
    updatedAt: serverTimestamp(),
  };

  try {
    const mediaRef = doc(db, 'catalog_media', mediaId);
    const snap = await getDoc(mediaRef);
    if (snap.exists()) {
      const existing = snap.data();
      payload.authorId = existing.authorId || uid;
      payload.createdAt = existing.createdAt;
      await setDoc(mediaRef, payload, { merge: true });
    } else {
      payload.authorId = uid;
      payload.createdAt = serverTimestamp();
      await setDoc(mediaRef, payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Seeds a list of media items into Firestore catalog_media collection.
 */
export async function seedCatalogToFirestore(items: MediaItem[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await saveCatalogMediaToFirestore(item);
      success++;
    } catch (err) {
      console.warn('Failed to seed item to Firestore:', item.title, err);
      failed++;
    }
  }
  return { success, failed };
}

/**
 * Deletes a catalog item from Firestore.
 */
export async function deleteCatalogMediaFromFirestore(mediaId: string): Promise<void> {
  const safeId = sanitizeFirestoreId(mediaId);
  const path = `catalog_media/${safeId}`;
  try {
    await deleteDoc(doc(db, 'catalog_media', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to the shared cloud catalog in real-time.
 * Anyone can read (valid year between 1888 and 2100).
 */
export function subscribeToCatalogMedia(
  onMediaList: (items: MediaItem[]) => void,
): Unsubscribe {
  const collRef = collection(db, 'catalog_media');
  let fallbackUnsub: Unsubscribe | null = null;

  const handleSnap = (snapshot: any) => {
    const items: MediaItem[] = [];
    snapshot.forEach((docSnap: any) => {
      const d = docSnap.data();
      if (d && d.title) {
        items.push({
          id: docSnap.id,
          title: d.title,
          originalTitle: d.originalTitle || d.title,
          type: d.type || 'pelicula',
          year: Number(d.year) || new Date().getFullYear(),
          genres: Array.isArray(d.genres) && d.genres.length > 0 ? d.genres : ['Drama'],
          director: d.director || 'Desconocido',
          cast: Array.isArray(d.cast) ? d.cast : [],
          synopsis: d.synopsis || '',
          duration: d.duration || '2h 00m',
          posterUrl: d.posterUrl || '',
          backdropUrl: d.backdropUrl || d.posterUrl || '',
          trailerYoutubeId: d.trailerUrl || d.trailerYoutubeId || '',
          defaultPlatform: d.defaultPlatform || 'Cine / Sala',
          streamingPlatforms: Array.isArray(d.streamingPlatforms) ? d.streamingPlatforms : [d.defaultPlatform || 'Cine'],
          communityRating: Number(d.communityRating ?? d.rating) || 0,
          communityVotesCount: Number(d.communityVotesCount ?? d.ratingCount) || 0,
          addedToListCount: Number(d.addedToListCount) || 0,
          isFeatured: Boolean(d.isFeatured),
          isTrending: Boolean(d.isTrending),
          isTopClassified: Boolean(d.isTopClassified),
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString().slice(0, 10) : typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString().slice(0, 10),
          comments: [],
          detailedVotes: {
            script: 0,
            acting: 0,
            soundtrack: 0,
            visuals: 0,
            direction: 0,
            totalVotes: 0,
            ratingDistribution: {},
          },
          isCustomUserCreated: true,
        } as MediaItem);
      }
    });
    onMediaList(items);
  };

  const primaryUnsub = onSnapshot(
    collRef,
    handleSnap,
    (err) => {
      console.warn('Firestore direct query subscription failed, trying filtered query:', err?.message);
      try {
        const q = query(
          collRef,
          where('year', '>=', 1888),
          where('year', '<=', 2100),
        );
        fallbackUnsub = onSnapshot(q, handleSnap, (fallbackErr) => {
          console.warn('Firestore fallback subscription error:', fallbackErr?.message);
        });
      } catch (e) {
        console.warn('Could not attach fallback Firestore subscription:', e);
      }
    },
  );

  return () => {
    primaryUnsub();
    if (fallbackUnsub) fallbackUnsub();
  };
}

/**
 * Quick diagnostic ping to verify live connectivity to Firestore.
 */
export async function pingFirestore(): Promise<{ ok: boolean; latencyMs: number; message: string; docCount: number }> {
  const start = Date.now();
  try {
    // Lectura mínima y compatible con las reglas de `catalog_media`.
    const snap = await getDocs(
      query(
        collection(db, 'catalog_media'),
        where('year', '>=', 1888),
        where('year', '<=', 2100),
        limit(25),
      ),
    );
    const latency = Date.now() - start;
    return {
      ok: true,
      latencyMs: latency,
      message: 'Conectado a Firebase Firestore en tiempo real.',
      docCount: snap.size,
    };
  } catch (err: any) {
    const latency = Date.now() - start;
    return {
      ok: false,
      latencyMs: latency,
      message: err?.message || 'Error al conectar con Firestore.',
      docCount: 0,
    };
  }
}

export { signInWithPopup, signOut, onAuthStateChanged, type FirebaseUser };
