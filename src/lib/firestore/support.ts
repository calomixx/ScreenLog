import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, sanitizeFirestoreId } from '../firebase';
import type {
  SupportTicket,
  SupportTicketPriority,
  SupportTicketStatus,
} from '../../types';

function tsToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof value === 'string' && value.trim()) return value;
  return new Date().toISOString();
}

function docToTicket(docId: string, data: Record<string, unknown>): SupportTicket {
  const statusRaw = String(data.status || 'abierto');
  const status: SupportTicketStatus =
    statusRaw === 'en_revision' || statusRaw === 'resuelto' || statusRaw === 'cerrado'
      ? statusRaw
      : 'abierto';
  const priorityRaw = String(data.priority || 'media');
  const priority: SupportTicketPriority =
    priorityRaw === 'baja' || priorityRaw === 'alta' ? priorityRaw : 'media';

  return {
    id: String(data.ticketId || docId),
    userId: String(data.userId || ''),
    name: String(data.senderName || 'Usuario'),
    email: String(data.senderEmail || ''),
    category: String(data.category || 'Soporte Técnico'),
    subject: String(data.subject || ''),
    message: String(data.message || ''),
    status,
    priority,
    adminNote: typeof data.adminNote === 'string' ? data.adminNote : undefined,
    resolvedBy: typeof data.resolvedBy === 'string' ? data.resolvedBy : undefined,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
    source: 'firestore',
  };
}

export async function createSupportTicketInFirestore(input: {
  id?: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  priority?: SupportTicketPriority;
}): Promise<SupportTicket | null> {
  const fbUser = auth.currentUser;
  if (!fbUser?.uid) return null;

  const ticketId = sanitizeFirestoreId(
    input.id || `tkt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  );
  const priority: SupportTicketPriority = input.priority || 'media';

  await setDoc(doc(db, 'support_tickets', ticketId), {
    ticketId,
    userId: fbUser.uid,
    senderName: String(input.name || fbUser.displayName || 'Usuario').trim().slice(0, 80) || 'Usuario',
    senderEmail: String(input.email || fbUser.email || 'usuario@takevault.app').trim().slice(0, 254),
    category: String(input.category || 'Soporte Técnico').trim().slice(0, 60) || 'Soporte Técnico',
    subject: String(input.subject || 'Consulta').trim().slice(0, 160) || 'Consulta',
    message: String(input.message || '').trim().slice(0, 4000) || '-',
    status: 'abierto',
    priority,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const now = new Date().toISOString();
  return {
    id: ticketId,
    userId: fbUser.uid,
    name: input.name,
    email: input.email,
    category: input.category,
    subject: input.subject,
    message: input.message,
    status: 'abierto',
    priority,
    createdAt: now,
    updatedAt: now,
    source: 'firestore',
  };
}

export function subscribeToSupportTickets(
  options: { isAdmin: boolean; uid?: string | null },
  onNext: (tickets: SupportTicket[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  if (!auth.currentUser?.uid) {
    onNext([]);
    return () => undefined;
  }

  const collRef = collection(db, 'support_tickets');
  const q = options.isAdmin
    ? query(collRef, orderBy('updatedAt', 'desc'))
    : query(collRef, where('userId', '==', options.uid || auth.currentUser.uid), orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => docToTicket(d.id, d.data() as Record<string, unknown>));
      onNext(list);
    },
    (err) => {
      console.warn('No se pudo suscribir a support_tickets:', err.message);
      onError?.(err);
    },
  );
}

export async function updateSupportTicketInFirestore(
  ticketId: string,
  patch: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    adminNote?: string;
    resolvedBy?: string;
  },
): Promise<void> {
  const safeId = sanitizeFirestoreId(ticketId);
  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (patch.status) payload.status = patch.status;
  if (patch.priority) payload.priority = patch.priority;
  if (typeof patch.adminNote === 'string') payload.adminNote = patch.adminNote.slice(0, 2000);
  if (typeof patch.resolvedBy === 'string') payload.resolvedBy = patch.resolvedBy.slice(0, 128);

  await setDoc(doc(db, 'support_tickets', safeId), payload, { merge: true });
}

export async function deleteSupportTicketInFirestore(ticketId: string): Promise<void> {
  const safeId = sanitizeFirestoreId(ticketId);
  await deleteDoc(doc(db, 'support_tickets', safeId));
}
