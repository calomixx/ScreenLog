import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, serverTimestamp, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth, BLUEPRINT_LIMITS, sanitizeFirestoreId } from './firebase';

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
    if (already) {
      if (already.email && already.email.toLowerCase() === cleanEmail.toLowerCase()) {
        return { ok: true, uid: already.uid, created: false };
      }
      // Nunca reutilizar la sesión Firebase de otra cuenta (p. ej. Daemon).
      await signOut(auth);
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
    if (auth.currentUser && (auth.currentUser.email || '').trim().toLowerCase() !== cleanEmail.toLowerCase()) {
      await signOut(auth).catch(() => undefined);
    }
    const code = (error as { code?: string })?.code || 'unknown';
    return {
      ok: false,
      code,
      message: FIREBASE_ERROR_MESSAGES[code] || 'No se pudo sincronizar la sesión con Firebase.',
    };
  }
}

/**
 * Crea o sincroniza una cuenta real en Firebase Auth y Firestore (`users`,
 * `users_public`, `users/{uid}/private/info`) usando una app secundaria aislada,
 * sin cerrar la sesión actual de Daemon/Superusuario.
 */
export async function provisionFirebaseUserAsAdmin(params: {
  email: string;
  password: string;
  name: string;
  username?: string;
  avatar?: string;
}): Promise<FirebaseIdentityResult & { idToken?: string }> {
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const cleanName = String(params.name || cleanEmail.split('@')[0] || 'Usuario')
    .trim()
    .slice(0, BLUEPRINT_LIMITS.NAME_MAX_LEN);

  if (!cleanEmail || !params.password) {
    return { ok: false, code: 'invalid-argument', message: 'Faltan email y contraseña.' };
  }

  const tempAppName = `provisioner_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const secondaryApp = initializeApp(firebaseConfig, tempAppName);
  const secondaryAuth = getAuth(secondaryApp);
  const secondaryDb =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
      ? getFirestore(secondaryApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(secondaryApp);

  try {
    const derived = await deriveFirebasePassword(cleanEmail, params.password);
    let user = null;
    let created = false;
    let lastCode = '';

    for (const candidate of [derived, params.password]) {
      try {
        const cred = await signInWithEmailAndPassword(secondaryAuth, cleanEmail, candidate);
        user = cred.user;
        break;
      } catch (err) {
        lastCode = (err as { code?: string })?.code || '';
      }
    }

    if (!user) {
      if (!canCreateAccount(lastCode)) {
        return {
          ok: false,
          code: lastCode || 'unknown',
          message: FIREBASE_ERROR_MESSAGES[lastCode] || 'No se pudo provisionar el usuario en Firebase.',
        };
      }
      const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, derived);
      user = cred.user;
      created = true;
    }

    try {
      await updateProfile(user, { displayName: cleanName });
    } catch {
      // Opcional
    }

    const uid = sanitizeFirestoreId(user.uid);
    const usernameBase = (params.username || cleanName.toLowerCase().replace(/[^a-z0-9._-]/g, '')) || 'usuario';
    const username = usernameBase.slice(0, BLUEPRINT_LIMITS.USERNAME_MAX_LEN);
    const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80';
    const avatar =
      params.avatar && !params.avatar.startsWith('data:')
        ? params.avatar.slice(0, BLUEPRINT_LIMITS.AVATAR_MAX_LEN)
        : defaultAvatar;

    // 1) users/{uid}
    const userRef = doc(secondaryDb, 'users', uid);
    const existingUserSnap = await getDoc(userRef).catch(() => null);
    if (existingUserSnap?.exists()) {
      await setDoc(
        userRef,
        {
          uid,
          displayName: cleanName,
          email: cleanEmail,
          photoURL: avatar,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await setDoc(userRef, {
        uid,
        displayName: cleanName,
        email: cleanEmail,
        photoURL: avatar,
        preferences: {
          theme: 'dark',
          language: 'es',
          favoriteGenres: [],
          defaultStatus: 'pending',
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // 2) users_public/{uid}
    await setDoc(doc(secondaryDb, 'users_public', uid), {
      userId: uid,
      name: cleanName,
      username,
      avatar,
      bio: '',
      city: '',
      favoriteGenres: ['Ciencia Ficción', 'Drama'],
      updatedAt: serverTimestamp(),
    });

    // 3) users/{uid}/private/info
    const privateRef = doc(secondaryDb, 'users', uid, 'private', 'info');
    const existingPrivate = await getDoc(privateRef).catch(() => null);
    if (existingPrivate?.exists()) {
      await setDoc(
        privateRef,
        {
          userId: uid,
          email: cleanEmail,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } else {
      await setDoc(privateRef, {
        userId: uid,
        email: cleanEmail,
        role: 'user',
        blocked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const idToken = await user.getIdToken().catch(() => undefined);
    return { ok: true, uid, created, idToken };
  } catch (error) {
    const code = (error as { code?: string })?.code || 'unknown';
    return {
      ok: false,
      code,
      message: FIREBASE_ERROR_MESSAGES[code] || (error instanceof Error ? error.message : 'Error provisionando usuario en Firebase.'),
    };
  } finally {
    await signOut(secondaryAuth).catch(() => undefined);
    await deleteApp(secondaryApp).catch(() => undefined);
  }
}
