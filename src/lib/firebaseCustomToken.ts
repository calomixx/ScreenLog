import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';
import { apiRequest, ApiError } from './api';

export interface CustomSessionResult {
  ok: boolean;
  uid?: string;
  message?: string;
  code?: string;
}

/**
 * Abre una sesión de Firebase Auth usando el usuario que ya inició sesión en la
 * app. El servidor firma un custom token; no hace falta el proveedor
 * Email/Password ni que el usuario vuelva a escribir su contraseña.
 */
export async function ensureFirebaseCustomSession(): Promise<CustomSessionResult> {
  if (auth.currentUser?.uid) {
    return { ok: true, uid: auth.currentUser.uid };
  }

  try {
    const response = await apiRequest<{ success: boolean; data: { token: string } }>(
      '/api/auth/firebase-token',
      { method: 'POST' },
    );
    const token = response.data?.token;
    if (!token) {
      return { ok: false, message: 'El servidor no devolvió un token de Firebase.' };
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
