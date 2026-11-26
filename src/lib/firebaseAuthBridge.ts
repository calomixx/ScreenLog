import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from './firebase';

export type FirebaseIdentityResult =
  | { ok: true; uid: string; created: boolean }
  | { ok: false; code: string; message: string };

const FIREBASE_ERROR_MESSAGES: Record<string, string> = {
  'auth/operation-not-allowed':
    'El acceso con email/contraseña está desactivado en Firebase. Actívalo en Authentication → Sign-in method.',
  'auth/email-already-in-use':
    'Ya existe una cuenta de Firebase con este email pero la contraseña no coincide. Borrá esa cuenta en Authentication → Users y volvé a entrar.',
  'auth/invalid-email': 'El email no es válido.',
  'auth/network-request-failed': 'Sin conexión con Firebase. Revisá tu red.',
  'auth/too-many-requests': 'Demasiados intentos en Firebase. Esperá unos minutos.',
};

/**
 * Firebase exige mínimo 6 caracteres; la app no. Derivamos una contraseña
 * larga y determinista a partir de la contraseña de la app, para que la
 * identidad de Firebase se cree sola sin pedirle nada al usuario.
 */
export async function deriveFirebasePassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`screenlog|${email.trim().toLowerCase()}|${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `sl!${hex}`;
}

function canCreateAccount(code: string): boolean {
  return [
    'auth/user-not-found',
    'auth/invalid-credential',
    'auth/invalid-login-credentials',
    'auth/wrong-password',
  ].includes(code);
}

/**
 * Crea o reutiliza la identidad de Firebase Auth para un usuario que ya se
 * autenticó contra el servidor de ScreenLog. Firestore firma las peticiones
 * con este UID, por lo que sin esta sesión las reglas rechazan sus escrituras.
 */
export async function ensureFirebasePasswordSession(
  email: string,
  password: string,
  displayName?: string,
): Promise<FirebaseIdentityResult> {
  const cleanEmail = String(email || '').trim();
  if (!cleanEmail || !password) {
    return { ok: false, code: 'invalid-argument', message: 'Faltan credenciales para Firebase.' };
  }

  try {
    const already = auth.currentUser;
    if (already?.email && already.email.toLowerCase() === cleanEmail.toLowerCase()) {
      return { ok: true, uid: already.uid, created: false };
    }

    const derived = await deriveFirebasePassword(cleanEmail, password);
    let lastCode = '';
    let created = false;
    let user = null;

    // Probamos la contraseña derivada y, por compatibilidad con cuentas
    // creadas antes de este cambio, la contraseña original de la app.
    for (const candidate of [derived, password]) {
      try {
        const credential = await signInWithEmailAndPassword(auth, cleanEmail, candidate);
        user = credential.user;
        break;
      } catch (loginError) {
        lastCode = (loginError as { code?: string })?.code || '';
      }
    }

    if (!user) {
      if (!canCreateAccount(lastCode)) {
        return {
          ok: false,
          code: lastCode || 'unknown',
          message: FIREBASE_ERROR_MESSAGES[lastCode] || 'No se pudo abrir la sesión de Firebase.',
        };
      }
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, derived);
      user = credential.user;
      created = true;
      if (displayName) {
        try {
          await updateProfile(user, { displayName });
        } catch {
          // El nombre se sincroniza igualmente en Firestore.
        }
      }
      try {
        await sendEmailVerification(user);
      } catch {
        // La biblioteca privada funciona sin verificación.
      }
    }

    return { ok: true, uid: user.uid, created };
  } catch (error) {
    const code = (error as { code?: string })?.code || 'unknown';
    return {
      ok: false,
      code,
      message: FIREBASE_ERROR_MESSAGES[code] || 'No se pudo sincronizar la sesión con Firebase.',
    };
  }
}
