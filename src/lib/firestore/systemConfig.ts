import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, sanitizeFirestoreId } from '../firebase';
import {
  mergePortalModules,
  mergeRatingBoxes,
  type PortalModulesConfig,
  type RatingBoxesConfig,
  type SystemPortalSettings,
} from '../../types';
import { listUserAccounts, type FirestoreUserSummary } from './users';

const PORTAL_SETTINGS_DOC = 'portal_settings';

export interface FirestoreAdminEntry {
  uid: string;
  email: string;
  role: 'owner' | 'admin' | 'moderator';
  name?: string;
  grantedBy?: string;
  updatedAt?: string;
}

export interface FirestoreDbUserIntegrity {
  uid: string;
  displayName: string;
  email: string;
  hasUsersDoc: boolean;
  hasPublicDoc: boolean;
  hasPrivateInfo: boolean;
  isAdminDoc: boolean;
  adminRole?: string;
  blockedInPrivate?: boolean;
  classificationsCount: number;
}

export interface DatabaseMonitoringSnapshot {
  checkedAt: string;
  totalUsers: number;
  totalPublicProfiles: number;
  totalAdmins: number;
  totalCatalogMedia: number;
  totalCommunityReviews: number;
  totalSupportTickets: number;
  monitorLeakedCount: number;
  missingPublicProfiles: number;
  missingPrivateInfos: number;
  users: FirestoreDbUserIntegrity[];
  admins: FirestoreAdminEntry[];
}

function tsToIso(value: unknown): string | undefined {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return typeof value === 'string' ? value : undefined;
}

function normalizeBoolMap<T extends object>(raw: unknown, defaults: T): T {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const result = { ...defaults } as Record<string, unknown>;
  for (const key of Object.keys(defaults)) {
    if (typeof src[key] === 'boolean') {
      result[key] = src[key];
    }
  }
  return result as T;
}

export function normalizeSystemConfig(raw?: Record<string, unknown> | null): SystemPortalSettings {
  const data = raw || {};
  return {
    portalName:
      typeof data.portalName === 'string' && data.portalName.trim()
        ? data.portalName.trim().slice(0, 80)
        : 'TakeVault',
    tagline:
      typeof data.tagline === 'string'
        ? data.tagline.trim().slice(0, 160)
        : 'Tu Diario Cinematográfico Privado',
    logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl.slice(0, 1000) : '',
    allowPublicRegistration:
      typeof data.allowPublicRegistration === 'boolean' ? data.allowPublicRegistration : true,
    communityCommentsEnabled:
      typeof data.communityCommentsEnabled === 'boolean' ? data.communityCommentsEnabled : true,
    catalogPerPage:
      typeof data.catalogPerPage === 'number'
        ? Math.max(6, Math.min(100, Math.round(data.catalogPerPage)))
        : 24,
    modules: normalizeBoolMap(
      data.modules as Partial<PortalModulesConfig> | undefined,
      mergePortalModules(),
    ),
    ratingBoxes: normalizeBoolMap(
      data.ratingBoxes as Partial<RatingBoxesConfig> | undefined,
      mergeRatingBoxes(),
    ),
    monitorModeEnforced:
      typeof data.monitorModeEnforced === 'boolean' ? data.monitorModeEnforced : true,
    updatedAt: tsToIso(data.updatedAt),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
  };
}

export async function getSystemConfig(): Promise<SystemPortalSettings | null> {
  try {
    const snap = await getDoc(doc(db, 'system_config', PORTAL_SETTINGS_DOC));
    if (!snap.exists()) return null;
    return normalizeSystemConfig(snap.data() as Record<string, unknown>);
  } catch (error) {
    console.warn('No se pudo leer system_config/portal_settings:', error);
    return null;
  }
}

export function subscribeToSystemConfig(
  onNext: (config: SystemPortalSettings) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'system_config', PORTAL_SETTINGS_DOC),
    (snap) => {
      if (!snap.exists()) return;
      onNext(normalizeSystemConfig(snap.data() as Record<string, unknown>));
    },
    (err) => {
      console.warn('Suscripción a system_config falló:', err.message);
      onError?.(err);
    },
  );
}

export async function saveSystemConfigToFirestore(
  settings: Partial<SystemPortalSettings>,
  updatedBy?: string,
): Promise<SystemPortalSettings> {
  const normalized = normalizeSystemConfig(settings as Record<string, unknown>);
  const payload: Record<string, unknown> = {
    portalName: normalized.portalName,
    tagline: normalized.tagline,
    logoUrl: normalized.logoUrl || '',
    allowPublicRegistration: normalized.allowPublicRegistration,
    communityCommentsEnabled: normalized.communityCommentsEnabled,
    catalogPerPage: normalized.catalogPerPage ?? 24,
    modules: normalized.modules,
    ratingBoxes: normalized.ratingBoxes,
    monitorModeEnforced: normalized.monitorModeEnforced ?? true,
    updatedAt: serverTimestamp(),
  };

  const actor = String(updatedBy || auth.currentUser?.uid || '').trim().slice(0, 128);
  if (actor) payload.updatedBy = actor;

  await setDoc(doc(db, 'system_config', PORTAL_SETTINGS_DOC), payload, { merge: true });
  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
    updatedBy: actor || normalized.updatedBy,
  };
}

export async function listFirestoreAdmins(): Promise<FirestoreAdminEntry[]> {
  try {
    await auth.authStateReady();
    if (!auth.currentUser) return [];
    const snap = await getDocs(collection(db, 'admins'));
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const roleRaw = String(data.role || 'admin');
      const role: 'owner' | 'admin' | 'moderator' =
        roleRaw === 'owner' || roleRaw === 'moderator' ? roleRaw : 'admin';
      return {
        uid: String(data.uid || d.id),
        email: String(data.email || ''),
        role,
        name: typeof data.name === 'string' ? data.name : undefined,
        grantedBy: typeof data.grantedBy === 'string' ? data.grantedBy : undefined,
        updatedAt: tsToIso(data.updatedAt),
      };
    });
  } catch (error) {
    console.warn('No se pudo listar colección admins:', error);
    return [];
  }
}

export async function grantAdminInFirestore(params: {
  uid: string;
  email: string;
  name?: string;
  grantedBy?: string;
}): Promise<void> {
  const safeUid = sanitizeFirestoreId(params.uid);
  await setDoc(doc(db, 'admins', safeUid), {
    uid: safeUid,
    email: String(params.email || '').trim().slice(0, 254),
    role: 'admin',
    ...(params.name ? { name: params.name.trim().slice(0, 80) } : {}),
    grantedBy: String(params.grantedBy || auth.currentUser?.uid || 'daemon').slice(0, 128),
    updatedAt: serverTimestamp(),
  });

  // Intentar sincronizar role en users/{uid}/private/info si ya existe
  try {
    const privRef = doc(db, 'users', safeUid, 'private', 'info');
    const privSnap = await getDoc(privRef);
    if (privSnap.exists()) {
      await setDoc(privRef, { role: 'admin', updatedAt: serverTimestamp() }, { merge: true });
    }
  } catch {
    // No bloquear si el usuario aún no tiene private/info
  }
}

export async function revokeAdminInFirestore(uid: string): Promise<void> {
  const safeUid = sanitizeFirestoreId(uid);
  await deleteDoc(doc(db, 'admins', safeUid));
  try {
    const privRef = doc(db, 'users', safeUid, 'private', 'info');
    const privSnap = await getDoc(privRef);
    if (privSnap.exists()) {
      await setDoc(privRef, { role: 'user', updatedAt: serverTimestamp() }, { merge: true });
    }
  } catch {
    // Opcional
  }
}

export async function updateUserBlockedFlagInFirestore(
  uid: string,
  email: string,
  blocked: boolean,
): Promise<boolean> {
  try {
    const safeUid = sanitizeFirestoreId(uid);
    const privRef = doc(db, 'users', safeUid, 'private', 'info');
    const privSnap = await getDoc(privRef).catch(() => null);
    if (privSnap?.exists()) {
      await setDoc(privRef, { blocked, updatedAt: serverTimestamp() }, { merge: true });
      return true;
    }
    const pubSnap = await getDoc(doc(db, 'users_public', safeUid)).catch(() => null);
    if (pubSnap?.exists()) {
      await setDoc(privRef, {
        userId: safeUid,
        email: String(email || 'user@takevault.app').slice(0, 254),
        role: 'user',
        blocked,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('No se pudo actualizar flag blocked en Firestore:', err);
    return false;
  }
}

/**
 * Elimina cualquier clasificación/película acumulada accidentalmente en la
 * cuenta de monitoreo (Daemon), manteniendo su perfil 100% libre de listas personales.
 */
export async function clearMonitorWatchlistEntries(
  monitorUid: string,
): Promise<{ removedClassifications: number; removedLegacy: number }> {
  const safeUid = sanitizeFirestoreId(monitorUid);
  let removedClassifications = 0;
  let removedLegacy = 0;

  if (!auth.currentUser || sanitizeFirestoreId(auth.currentUser.uid) !== safeUid) {
    return { removedClassifications: 0, removedLegacy: 0 };
  }

  try {
    const classSnap = await getDocs(collection(db, 'users', safeUid, 'movie_classifications'));
    if (!classSnap.empty) {
      const docs = classSnap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      removedClassifications = docs.length;
    }
  } catch (err) {
    console.warn('Error limpiando movie_classifications del monitor:', err);
  }

  try {
    const legacySnap = await getDocs(
      query(collection(db, 'user_library'), where('userId', '==', safeUid)),
    );
    if (!legacySnap.empty) {
      const docs = legacySnap.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      removedLegacy = docs.length;
    }
  } catch (err) {
    console.warn('Error limpiando user_library del monitor:', err);
  }

  return { removedClassifications, removedLegacy };
}

export async function inspectDatabaseMonitoringSnapshot(
  monitorUid?: string | null,
): Promise<DatabaseMonitoringSnapshot> {
  const [usersList, publicSnap, adminsList, catalogCount, reviewsCount, ticketsCount] =
    await Promise.all([
      listUserAccounts(),
      getDocs(collection(db, 'users_public')).catch(() => null),
      listFirestoreAdmins(),
      getCountFromServer(collection(db, 'catalog_media'))
        .then((s) => s.data().count)
        .catch(() => 0),
      getCountFromServer(collection(db, 'community_reviews'))
        .then((s) => s.data().count)
        .catch(() => 0),
      getCountFromServer(collection(db, 'support_tickets'))
        .then((s) => s.data().count)
        .catch(() => 0),
    ]);

  const publicMap = new Map<string, Record<string, unknown>>();
  if (publicSnap) {
    publicSnap.docs.forEach((d) => publicMap.set(d.id, d.data() as Record<string, unknown>));
  }

  const adminMap = new Map<string, FirestoreAdminEntry>();
  adminsList.forEach((a) => adminMap.set(a.uid, a));

  const userMap = new Map<string, FirestoreUserSummary>();
  usersList.forEach((u) => userMap.set(u.uid, u));

  const allUids = new Set<string>([...userMap.keys(), ...publicMap.keys()]);
  const integrityRows: FirestoreDbUserIntegrity[] = await Promise.all(
    Array.from(allUids).map(async (uid) => {
      const userDoc = userMap.get(uid);
      const pubDoc = publicMap.get(uid);
      const adminEntry = adminMap.get(uid);

      let hasPrivateInfo = false;
      let blockedInPrivate: boolean | undefined;
      let classificationsCount = 0;

      try {
        const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
        if (privSnap.exists()) {
          hasPrivateInfo = true;
          const pData = privSnap.data() as Record<string, unknown>;
          if (typeof pData.blocked === 'boolean') blockedInPrivate = pData.blocked;
        }
      } catch {
        // Ignorar si no es admin en Firestore todavía
      }

      try {
        const cSnap = await getCountFromServer(collection(db, 'users', uid, 'movie_classifications'));
        classificationsCount = cSnap.data().count;
      } catch {
        classificationsCount = 0;
      }

      return {
        uid,
        displayName:
          userDoc?.displayName ||
          (typeof pubDoc?.name === 'string' ? pubDoc.name : '') ||
          adminEntry?.name ||
          'Usuario',
        email: userDoc?.email || adminEntry?.email || '',
        hasUsersDoc: Boolean(userDoc),
        hasPublicDoc: Boolean(pubDoc),
        hasPrivateInfo,
        isAdminDoc: Boolean(adminEntry),
        adminRole: adminEntry?.role,
        blockedInPrivate,
        classificationsCount,
      };
    }),
  );

  let monitorLeakedCount = 0;
  if (monitorUid) {
    const safeMonitorUid = sanitizeFirestoreId(monitorUid);
    const matched = integrityRows.find((r) => r.uid === safeMonitorUid);
    monitorLeakedCount = matched?.classificationsCount ?? 0;
    if (!matched) {
      try {
        const cSnap = await getCountFromServer(
          collection(db, 'users', safeMonitorUid, 'movie_classifications'),
        );
        monitorLeakedCount = cSnap.data().count;
      } catch {
        monitorLeakedCount = 0;
      }
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    totalUsers: userMap.size,
    totalPublicProfiles: publicMap.size,
    totalAdmins: adminsList.length,
    totalCatalogMedia: catalogCount,
    totalCommunityReviews: reviewsCount,
    totalSupportTickets: ticketsCount,
    monitorLeakedCount,
    missingPublicProfiles: integrityRows.filter((u) => u.hasUsersDoc && !u.hasPublicDoc).length,
    missingPrivateInfos: integrityRows.filter((u) => !u.hasPrivateInfo).length,
    users: integrityRows.sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
    admins: adminsList,
  };
}
