import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';
import { apiRequest, ApiError } from './api';

export interface CustomSessionResult {
  ok: boolean;
  uid?: string;
  message?: string;
  code?: string;
}

function readTokenUid(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const json = JSON.parse(atob(padded)) as { uid?: unknown; sub?: unknown; user_id?: unknown };
    const uid = json.uid ?? json.user_id ?? json.sub;
    return typeof uid === 'string' && uid ? uid : null;
  } catch {
    return null;
  }
}

/**
 * Abre una sesión de Firebase Auth usando el usuario que ya inició sesión en la
 * app. El servidor firma un custom token; no hace falta el proveedor
 * Email/Password ni que el usuario vuelva a escribir su contraseña.
 *
 * Importante: si ya hay una sesión de Firebase, comprobamos que sea la del
 * usuario actual. Si era de otro usuario (por ejemplo, se cambió de cuenta),
 * la reemplazamos para no escribir datos con la identidad equivocada.
 */
export async function ensureFirebaseCustomSession(): Promise<CustomSessionResult> {
  try {
    const response = await apiRequest<{ success: boolean; data: { token: string } }>(
      '/api/auth/firebase-token',
      { method: 'POST' },
    );
    const token = response.data?.token;
    if (!token) {
      return { ok: false, message: 'El servidor no devolvió un token de Firebase.' };
    }

    const expectedUid = readTokenUid(token);
    const currentUid = auth.currentUser?.uid;
    if (expectedUid && currentUid && currentUid === expectedUid) {
      return { ok: true, uid: currentUid };
    }

    const credential = await signInWithCustomToken(auth, token);
    return { ok: true, uid: credential.user.uid };
  } catch (error) {
    if (error instanceof ApiError) {
      return { ok: false, message: error.message, code: error.code };
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : 'No se pudo crear la sesión de Firebase.',
    };
  }
}
