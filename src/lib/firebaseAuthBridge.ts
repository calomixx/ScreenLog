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
    'Ya existe una cuenta de Firebase con este email. Inicia sesión con la contraseña correcta.',
  'auth/weak-password': 'La contraseña es demasiado débil para Firebase (mínimo 6 caracteres).',
  'auth/invalid-email': 'El email no es válido.',
  'auth/network-request-failed': 'Sin conexión con Firebase. Revisa tu red.',
  'auth/too-many-requests': 'Demasiados intentos en Firebase. Espera unos minutos.',
  'auth/invalid-credential': 'La contraseña no coincide con la cuenta de Firebase.',
};

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

    let created = false;
    let user = null;
    try {
      const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      user = credential.user;
    } catch (loginError) {
      const code = (loginError as { code?: string })?.code || '';
      const canCreate = [
        'auth/user-not-found',
        'auth/invalid-credential',
        'auth/invalid-login-credentials',
      ].includes(code);
      if (!canCreate) throw loginError;
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
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
        // Sin verificación el usuario puede usar su biblioteca privada;
        // las acciones públicas seguirán requiriendo email verificado.
      }
    }

    if (!user) {
      return {
        ok: false,
        code: 'unknown',
        message: 'No se pudo crear la sesión de Firebase.',
      };
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
