import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';

/**
 * Diagnóstico de la sesión de Firebase Auth y de las escrituras a Firestore.
 *
 * Sirve para entender por qué una clasificación no aparece en la nube:
 * si no hay sesión de Firebase, Firestore no puede autenticar la escritura.
 *
 * En el navegador se puede consultar con `__SL_FIRESTORE_DIAG()`.
 */
export interface FirestoreSessionSnapshot {
  hasSession: boolean;
  uid: string | null;
  email: string | null;
  emailVerified: boolean;
}

export interface FirestoreWriteDiagnostics {
  attempts: number;
  successes: number;
  failures: number;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: { at: string; message: string; code?: string } | null;
}

const writes: FirestoreWriteDiagnostics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
};

export function getFirebaseSessionSnapshot(): FirestoreSessionSnapshot {
  const user = auth.currentUser;
  return {
    hasSession: Boolean(user?.uid),
    uid: user?.uid ?? null,
    email: user?.email ?? null,
    emailVerified: Boolean(user?.emailVerified),
  };
}

export function recordWriteAttempt(): void {
  writes.attempts += 1;
  writes.lastAttemptAt = new Date().toISOString();
}

export function recordWriteSuccess(): void {
  writes.successes += 1;
  writes.lastSuccessAt = new Date().toISOString();
}

export function recordWriteFailure(error: unknown): void {
  writes.failures += 1;
  const err = error as { message?: string; code?: string };
  writes.lastError = {
    at: new Date().toISOString(),
    message: err?.message || String(error),
    code: err?.code,
  };
}

export function getFirestoreDiagnostics(): {
  session: FirestoreSessionSnapshot;
  writes: FirestoreWriteDiagnostics;
  hint: string;
} {
  const session = getFirebaseSessionSnapshot();
  return {
    session,
    writes,
    hint: session.hasSession
      ? 'Hay sesión de Firebase: las escrituras se autentican.'
      : 'Todavía no hay sesión de Firebase. La app la abre sola al iniciar sesión; si insiste, revisá la credencial de servicio del servidor o habilitá Email/Password en Firebase Auth.',
  };
}

export interface FirestoreReadProbe {
  ok: boolean;
  latencyMs: number;
  docs: number;
  message: string;
  code?: string;
}

/**
 * Prueba de lectura real contra Firestore. Sirve para saber si el problema es
 * de red, de permisos (reglas) o de configuración, sin depender de la UI.
 */
export async function probeFirestoreRead(): Promise<FirestoreReadProbe> {
  const start = Date.now();
  try {
    const snap = await getDocs(
      query(
        collection(db, 'catalog_media'),
        where('year', '>=', 1888),
        where('year', '<=', 2100),
        limit(1),
      ),
    );
    return {
      ok: true,
      latencyMs: Date.now() - start,
      docs: snap.size,
      message: 'Lectura correcta de catalog_media.',
    };
  } catch (error) {
    const err = error as { message?: string; code?: string };
    return {
      ok: false,
      latencyMs: Date.now() - start,
      docs: 0,
      message: err?.message || String(error),
      code: err?.code,
    };
  }
}

/** Expone el diagnóstico en la consola del navegador. */
export function installFirestoreDiagnosticsGlobal(): void {
  if (typeof window === 'undefined') return;
  const target = window as unknown as {
    __SL_FIRESTORE_DIAG?: typeof getFirestoreDiagnostics;
    __SL_FIRESTORE_PROBE?: typeof probeFirestoreRead;
  };
  target.__SL_FIRESTORE_DIAG = getFirestoreDiagnostics;
  target.__SL_FIRESTORE_PROBE = probeFirestoreRead;
}
