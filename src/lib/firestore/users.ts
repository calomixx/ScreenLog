import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  clampString,
  clampStringList,
  isMovieStatus,
  sanitizeFirestoreId,
  type MovieStatus,
  type UserAccount,
  type UserPreferences,
} from './schema';

const DISPLAY_NAME_MAX = 80;
const EMAIL_MAX = 254;
const PHOTO_MAX = 1000;
const GENRE_MAX_COUNT = 10;
const GENRE_MAX_LEN = 40;

export interface EnsureUserAccountInput {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  preferences?: UserPreferences;
}

function userRef(uid: string) {
  return doc(db, 'users', sanitizeFirestoreId(uid));
}

function requireSameUser(uid: string): string {
  const safeUid = sanitizeFirestoreId(uid);
  if (!auth.currentUser) {
    throw new Error('Inicia sesión para continuar.');
  }
  if (sanitizeFirestoreId(auth.currentUser.uid) !== safeUid) {
    throw new Error('No puedes modificar la cuenta de otro usuario.');
  }
  return safeUid;
}

function sanitizePreferences(raw: unknown): UserPreferences {
  const value = (raw && typeof raw === 'object' ? raw : {}) as UserPreferences;
  const preferences: UserPreferences = {};
  if (value.theme === 'dark' || value.theme === 'light' || value.theme === 'system') {
    preferences.theme = value.theme;
  }
  if (value.language === 'es' || value.language === 'en') {
    preferences.language = value.language;
  }
  const genres = clampStringList(value.favoriteGenres, GENRE_MAX_COUNT, GENRE_MAX_LEN);
  if (genres.length > 0) preferences.favoriteGenres = genres;
  if (isMovieStatus(value.defaultStatus)) preferences.defaultStatus = value.defaultStatus;
  return preferences;
}

/**
 * Crea (o actualiza) el documento `users/{uid}`.
 * Es idempotente: se llama al iniciar sesión y tras editar el perfil.
 */
export async function ensureUserAccount(input: EnsureUserAccountInput): Promise<UserAccount | null> {
  const safeUid = sanitizeFirestoreId(input.uid);
  if (!safeUid) return null;
  try {
    const ref = userRef(safeUid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? (snap.data() as Record<string, unknown>) : null;

    const displayName =
      clampString(input.displayName, DISPLAY_NAME_MAX) ||
      clampString(existing?.displayName, DISPLAY_NAME_MAX) ||
      'Cinéfilo';
    const email =
      clampString(input.email, EMAIL_MAX) || clampString(existing?.email, EMAIL_MAX);
    const photoURL =
      clampString(input.photoURL, PHOTO_MAX) || clampString(existing?.photoURL, PHOTO_MAX);
    const preferences = sanitizePreferences(
      input.preferences ?? (existing?.preferences as UserPreferences | undefined) ?? {},
    );

    await setDoc(
      ref,
      {
        uid: safeUid,
        displayName,
        email,
        photoURL,
        preferences,
        createdAt: existing?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return await getUserAccount(safeUid);
  } catch (error) {
    console.warn('No se pudo sincronizar la cuenta en Firestore:', error);
    return null;
  }
}

export async function getUserAccount(uid: string): Promise<UserAccount | null> {
  const safeUid = sanitizeFirestoreId(uid);
  try {
    const snap = await getDoc(userRef(safeUid));
    if (!snap.exists()) return null;
    const data = snap.data() as Record<string, unknown>;
    return {
      uid: safeUid,
      displayName: clampString(data.displayName, DISPLAY_NAME_MAX) || 'Cinéfilo',
      email: clampString(data.email, EMAIL_MAX),
      photoURL: clampString(data.photoURL, PHOTO_MAX),
      preferences: sanitizePreferences(data.preferences),
      legacyLibraryMigratedAt: (data.legacyLibraryMigratedAt as UserAccount['legacyLibraryMigratedAt']) ?? null,
      createdAt: (data.createdAt as UserAccount['createdAt']) ?? null,
      updatedAt: (data.updatedAt as UserAccount['updatedAt']) ?? null,
    };
  } catch (error) {
    console.warn('No se pudo leer la cuenta de Firestore:', error);
    return null;
  }
}

export async function updateUserPreferences(
  uid: string,
  preferences: UserPreferences,
): Promise<UserAccount | null> {
  const safeUid = requireSameUser(uid);
  const clean = sanitizePreferences(preferences);
  try {
    await setDoc(
      userRef(safeUid),
      { preferences: clean, updatedAt: serverTimestamp() },
      { merge: true },
    );
    return await getUserAccount(safeUid);
  } catch (error) {
    console.warn('No se pudieron guardar las preferencias:', error);
    return null;
  }
}

export async function markLegacyLibraryMigrated(uid: string): Promise<void> {
  const safeUid = requireSameUser(uid);
  await setDoc(
    userRef(safeUid),
    { legacyLibraryMigratedAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/**
 * Resumen de una cuenta para el panel de administración. Se lee con la sesión
 * de Firebase del navegador, así que funciona aunque el servidor no tenga
 * credenciales de servicio. Requiere que la regla de `users` permita `list`
 * a un administrador.
 */
export interface FirestoreUserSummary {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  favoriteGenres: string[];
  createdAt: Date | null;
}

export async function listUserAccounts(): Promise<FirestoreUserSummary[]> {
  if (!auth.currentUser) return [];
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      const preferences = sanitizePreferences(data.preferences);
      const createdAt = data.createdAt as { toDate?: () => Date } | null | undefined;
      return {
        uid: docSnap.id,
        displayName: clampString(data.displayName, DISPLAY_NAME_MAX) || 'Cinéfilo',
        email: clampString(data.email, EMAIL_MAX),
        photoURL: clampString(data.photoURL, PHOTO_MAX),
        favoriteGenres: preferences.favoriteGenres ?? [],
        createdAt: typeof createdAt?.toDate === 'function' ? createdAt.toDate() : null,
      };
    });
  } catch (error) {
    console.warn('No se pudieron listar las cuentas de Firestore:', error);
    return [];
  }
}

export function subscribeUserAccount(
  uid: string,
  onAccount: (account: UserAccount | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  return onSnapshot(
    userRef(safeUid),
    (snap) => {
      if (!snap.exists()) {
        onAccount(null);
        return;
      }
      const data = snap.data() as Record<string, unknown>;
      onAccount({
        uid: safeUid,
        displayName: clampString(data.displayName, DISPLAY_NAME_MAX) || 'Cinéfilo',
        email: clampString(data.email, EMAIL_MAX),
        photoURL: clampString(data.photoURL, PHOTO_MAX),
        preferences: sanitizePreferences(data.preferences),
        legacyLibraryMigratedAt: (data.legacyLibraryMigratedAt as UserAccount['legacyLibraryMigratedAt']) ?? null,
        createdAt: (data.createdAt as UserAccount['createdAt']) ?? null,
        updatedAt: (data.updatedAt as UserAccount['updatedAt']) ?? null,
      });
    },
    (error) => onError?.(error),
  );
}

export type { MovieStatus };
