import { auth } from '../firebase';

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
      ? 'Hay sesión de Firebase: las escrituras deberían autenticarse.'
      : 'No hay sesión de Firebase. Cierra sesión en la app y vuelve a entrar con email y contraseña (o con Google) para vincularla.',
  };
}

/** Expone el diagnóstico en la consola del navegador. */
export function installFirestoreDiagnosticsGlobal(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { __SL_FIRESTORE_DIAG?: typeof getFirestoreDiagnostics }).__SL_FIRESTORE_DIAG =
    getFirestoreDiagnostics;
}
