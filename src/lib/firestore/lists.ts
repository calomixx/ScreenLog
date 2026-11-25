import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import {
  CLASSIFICATION_LIMITS,
  clampString,
  sanitizeFirestoreId,
  type CustomList,
  type CustomListItem,
} from './schema';

export interface CustomListInput {
  name: string;
  description?: string;
  isPublic?: boolean;
}

function requireSameUser(uid: string): string {
  const safeUid = sanitizeFirestoreId(uid);
  if (!auth.currentUser || sanitizeFirestoreId(auth.currentUser.uid) !== safeUid) {
    throw new Error('No puedes modificar las listas de otro usuario.');
  }
  return safeUid;
}

function listsCollection(uid: string) {
  return collection(db, 'users', sanitizeFirestoreId(uid), 'lists');
}

function listDoc(uid: string, listId: string) {
  return doc(db, 'users', sanitizeFirestoreId(uid), 'lists', sanitizeFirestoreId(listId));
}

function listItemsCollection(uid: string, listId: string) {
  return collection(
    db,
    'users',
    sanitizeFirestoreId(uid),
    'lists',
    sanitizeFirestoreId(listId),
    'items',
  );
}

function normalizeList(listId: string, uid: string, data: Record<string, unknown>): CustomList {
  return {
    listId,
    uid,
    name: clampString(data.name, CLASSIFICATION_LIMITS.NAME_MAX_LEN),
    description: clampString(data.description, CLASSIFICATION_LIMITS.DESCRIPTION_MAX_LEN),
    isPublic: Boolean(data.isPublic),
    createdAt: (data.createdAt as CustomList['createdAt']) ?? null,
    updatedAt: (data.updatedAt as CustomList['updatedAt']) ?? null,
  };
}

function normalizeItem(movieId: string, data: Record<string, unknown>): CustomListItem {
  return {
    movieId,
    addedAt: (data.addedAt as CustomListItem['addedAt']) ?? null,
    position: Number(data.position) || 0,
  };
}

export async function createCustomList(uid: string, input: CustomListInput): Promise<CustomList> {
  const safeUid = requireSameUser(uid);
  const name = clampString(input.name, CLASSIFICATION_LIMITS.NAME_MAX_LEN);
  if (!name) throw new Error('La lista necesita un nombre.');

  const countSnap = await getCountFromServer(listsCollection(safeUid));
  if (countSnap.data().count >= CLASSIFICATION_LIMITS.MAX_LISTS) {
    throw new Error(`Has alcanzado el límite de ${CLASSIFICATION_LIMITS.MAX_LISTS} listas.`);
  }

  const ref = doc(listsCollection(safeUid));
  await setDoc(ref, {
    listId: ref.id,
    uid: safeUid,
    name,
    description: clampString(input.description, CLASSIFICATION_LIMITS.DESCRIPTION_MAX_LEN),
    isPublic: Boolean(input.isPublic),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return normalizeList(ref.id, safeUid, (snap.data() || {}) as Record<string, unknown>);
}

export async function updateCustomList(
  uid: string,
  listId: string,
  patch: Partial<CustomListInput>,
): Promise<void> {
  const safeUid = requireSameUser(uid);
  const data: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (patch.name !== undefined) {
    const name = clampString(patch.name, CLASSIFICATION_LIMITS.NAME_MAX_LEN);
    if (!name) throw new Error('La lista necesita un nombre.');
    data.name = name;
  }
  if (patch.description !== undefined) {
    data.description = clampString(
      patch.description,
      CLASSIFICATION_LIMITS.DESCRIPTION_MAX_LEN,
    );
  }
  if (patch.isPublic !== undefined) data.isPublic = Boolean(patch.isPublic);
  await setDoc(listDoc(safeUid, listId), data, { merge: true });
}

export async function deleteCustomList(uid: string, listId: string): Promise<void> {
  const safeUid = requireSameUser(uid);
  const items = await getDocs(listItemsCollection(safeUid, listId));
  const batch = writeBatch(db);
  items.forEach((item) => batch.delete(item.ref));
  batch.delete(listDoc(safeUid, listId));
  await batch.commit();
}

export async function addMovieToCustomList(
  uid: string,
  listId: string,
  movieId: string,
  position = 0,
): Promise<void> {
  const safeUid = requireSameUser(uid);
  const safeMovieId = sanitizeFirestoreId(movieId);
  const ref = doc(listItemsCollection(safeUid, listId), safeMovieId);
  const existing = await getDoc(ref);
  await setDoc(ref, {
    movieId: safeMovieId,
    position: Number.isFinite(position) ? position : 0,
    addedAt: existing.exists() ? existing.data()?.addedAt ?? serverTimestamp() : serverTimestamp(),
  });
}

export async function removeMovieFromCustomList(
  uid: string,
  listId: string,
  movieId: string,
): Promise<void> {
  const safeUid = requireSameUser(uid);
  await deleteDoc(doc(listItemsCollection(safeUid, listId), sanitizeFirestoreId(movieId)));
}

export function subscribeToCustomLists(
  uid: string,
  onLists: (lists: CustomList[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  return onSnapshot(
    query(listsCollection(safeUid), orderBy('updatedAt', 'desc')),
    (snapshot) => {
      const lists: CustomList[] = [];
      snapshot.forEach((docSnap) =>
        lists.push(normalizeList(docSnap.id, safeUid, docSnap.data() as Record<string, unknown>)),
      );
      onLists(lists);
    },
    (error) => onError?.(error),
  );
}

export function subscribeToCustomListItems(
  uid: string,
  listId: string,
  onItems: (items: CustomListItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const safeUid = sanitizeFirestoreId(uid);
  return onSnapshot(
    query(listItemsCollection(safeUid, listId), orderBy('position', 'asc')),
    (snapshot) => {
      const items: CustomListItem[] = [];
      snapshot.forEach((docSnap) =>
        items.push(normalizeItem(docSnap.id, docSnap.data() as Record<string, unknown>)),
      );
      onItems(items);
    },
    (error) => onError?.(error),
  );
}
