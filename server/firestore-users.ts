import { FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getFirebaseFirestore } from './firebase-admin';
import type { StoredUser } from './store';

/**
 * Puente entre las cuentas del servidor y `users/{uid}` de Firestore.
 *
 * El JSON del servidor es efímero en Cloud Run; Firestore es la fuente que
 * sobrevive a los reinicios. El panel de administración usa las dos: muestra
 * las cuentas del servidor y añade las que solo existen en Firestore.
 */

export interface FirestoreUserRecord {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  favoriteGenres: string[];
  createdAt: string | null;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const candidate = value as { toDate?: () => Date; seconds?: number };
  if (typeof candidate.toDate === 'function') return candidate.toDate().toISOString();
  if (typeof candidate.seconds === 'number') return new Date(candidate.seconds * 1000).toISOString();
  return null;
}

export async function listFirestoreUsers(): Promise<FirestoreUserRecord[]> {
  const db = getFirebaseFirestore();
  if (!db) return [];
  try {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map((doc) => {
      const data = doc.data() as Record<string, unknown>;
      const preferences = (data.preferences || {}) as { favoriteGenres?: unknown };
      const genres = Array.isArray(preferences.favoriteGenres)
        ? preferences.favoriteGenres.filter((g): g is string => typeof g === 'string').slice(0, 10)
        : [];
      return {
        uid: doc.id,
        email: typeof data.email === 'string' ? data.email : '',
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        photoURL: typeof data.photoURL === 'string' ? data.photoURL : '',
        favoriteGenres: genres,
        createdAt: toIso(data.createdAt),
      };
    });
  } catch (error) {
    console.warn('No se pudieron leer los usuarios de Firestore:', error);
    return [];
  }
}

/**
 * Refleja una cuenta del servidor en `users/{uid}` de Firestore.
 * Se busca el UID real de Firebase Auth por email para no crear documentos
 * duplicados con el id interno del servidor (`usr_...`).
 */
export async function syncUserToFirestore(
  user: Pick<StoredUser, 'email' | 'name' | 'avatar' | 'favoriteGenres'>,
): Promise<boolean> {
  const db = getFirebaseFirestore();
  if (!db || !user.email) return false;
  try {
    const auth = getAuth();
    const fbUser = await auth.getUserByEmail(user.email);
    const ref = db.collection('users').doc(fbUser.uid);
    const snapshot = await ref.get();
    const existing = snapshot.exists ? (snapshot.data() as Record<string, unknown>) : null;
    const existingPreferences = (existing?.preferences || {}) as Record<string, unknown>;

    await ref.set(
      {
        uid: fbUser.uid,
        displayName: user.name,
        email: user.email,
        photoURL: user.avatar || '',
        preferences: {
          ...existingPreferences,
          favoriteGenres: user.favoriteGenres || [],
        },
        createdAt: existing?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return true;
  } catch (error) {
    console.warn(`No se pudo sincronizar ${user.email} con Firestore:`, error);
    return false;
  }
}
