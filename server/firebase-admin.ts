import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

/**
 * Sesión de Firebase para los usuarios de la app sin depender del proveedor
 * Email/Password.
 *
 * El servidor crea (si falta) el usuario de Firebase con el mismo id que el
 * usuario de la app y firma un "custom token"; el navegador lo canjea con
 * signInWithCustomToken. Así Firestore tiene request.auth.uid sin pedirle
 * nada extra al usuario.
 *
 * Credenciales: se leen de, en este orden,
 *  1. FIREBASE_SERVICE_ACCOUNT_JSON  (JSON completo en una variable)
 *  2. FIREBASE_SERVICE_ACCOUNT_FILE  (ruta al JSON)
 *  3. serviceAccountKey.json en la raíz del proyecto
 *  4. server/serviceAccountKey.json
 *  5. firebase-service-account.json en la raíz
 */

interface AdminStatus {
  ready: boolean;
  message: string;
}

let cached: AdminStatus | null = null;

function candidateFiles(): string[] {
  const fromEnv = (process.env.FIREBASE_SERVICE_ACCOUNT_FILE || '').trim();
  const files = [
    fromEnv,
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'server', 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'firebase-service-account.json'),
  ];
  return files.filter(Boolean);
}

function loadServiceAccount(): Record<string, unknown> | null {
  const rawJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (rawJson) {
    try {
      return JSON.parse(rawJson) as Record<string, unknown>;
    } catch {
      console.warn('FIREBASE_SERVICE_ACCOUNT_JSON no es un JSON válido.');
    }
  }
  for (const file of candidateFiles()) {
    if (!existsSync(file)) continue;
    try {
      return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    } catch (error) {
      console.warn(`No se pudo leer ${file}:`, error);
    }
  }
  return null;
}

function ensureInitialized(): AdminStatus {
  // Si ya está lista, no volvemos a leer archivos.
  if (cached?.ready) return cached;

  const serviceAccount = loadServiceAccount();

  try {
    if (getApps().length === 0) {
      if (serviceAccount) {
        initializeApp({
          credential: cert(serviceAccount as Parameters<typeof cert>[0]),
          projectId:
            (serviceAccount.project_id as string | undefined) ||
            (process.env.FIREBASE_PROJECT_ID || '').trim() ||
            firebaseConfig.projectId ||
            'screeamlog',
        });
      } else {
        // En Cloud Run / App Hosting la credencial viene del service account
        // del propio servicio. Así el panel puede leer Firestore sin subir
        // manualmente una clave privada.
        initializeApp({
          credential: applicationDefault(),
          projectId: (process.env.FIREBASE_PROJECT_ID || '').trim() || firebaseConfig.projectId,
        });
      }
    }
    cached = {
      ready: true,
      message: serviceAccount
        ? 'Firebase Admin inicializado con credencial de servicio.'
        : 'Firebase Admin inicializado con las credenciales del entorno.',
    };
  } catch (error) {
    cached = {
      ready: false,
      message: `No se pudo inicializar Firebase Admin: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return cached;
}

export function getFirebaseAdminStatus(): AdminStatus {
  return ensureInitialized();
}

function isUserNotFound(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'auth/user-not-found';
}

function isEmailTaken(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'auth/email-already-exists' || code === 'auth/uid-already-exists';
}

/**
 * Crea el usuario de Firebase si todavía no existe, con el mismo id que el
 * usuario de la app. Deja el email verificado porque la app ya validó la
 * identidad con su propio login.
 */
async function ensureAuthUser(
  auth: Auth,
  uid: string,
  email?: string | null,
  displayName?: string | null,
): Promise<void> {
  const cleanEmail = (email || '').trim().toLowerCase();
  try {
    const existing = await auth.getUser(uid);
    const patch: Parameters<Auth['updateUser']>[1] = {};
    if (cleanEmail && existing.email?.toLowerCase() !== cleanEmail) {
      patch.email = cleanEmail;
    }
    if (cleanEmail && !existing.emailVerified) {
      patch.emailVerified = true;
    }
    if (displayName && !existing.displayName) {
      patch.displayName = displayName.slice(0, 80);
    }
    if (Object.keys(patch).length > 0) {
      await auth.updateUser(uid, patch).catch((error) => {
        console.warn(`No se pudo actualizar el usuario ${uid} en Firebase Auth:`, error);
      });
    }
    return;
  } catch (error) {
    if (!isUserNotFound(error)) {
      console.warn(`No se pudo leer el usuario ${uid} en Firebase Auth:`, error);
    }
  }

  try {
    await auth.createUser({
      uid,
      email: cleanEmail || undefined,
      emailVerified: Boolean(cleanEmail),
      displayName: displayName?.slice(0, 80) || undefined,
    });
  } catch (error) {
    if (!isEmailTaken(error)) {
      console.warn(`No se pudo crear el usuario ${uid} en Firebase Auth:`, error);
      return;
    }
    // El email ya pertenece a otra cuenta de Firebase: creamos el usuario sin
    // email para no bloquear el guardado.
    await auth
      .createUser({ uid, displayName: displayName?.slice(0, 80) || undefined })
      .catch((err) => console.warn(`No se pudo crear el usuario ${uid} sin email:`, err));
  }
}

/**
 * Firma un token para que el navegador abra una sesión de Firebase con el
 * mismo id que el usuario de la app.
 */
export async function createFirebaseCustomToken(
  uid: string,
  email?: string | null,
  displayName?: string | null,
): Promise<string> {
  const status = ensureInitialized();
  if (!status.ready) throw new Error(status.message);

  const auth = getAuth();

  // Si el email ya tiene un UID de Firebase Auth (por ejemplo, porque el
  // usuario entró antes con Email/Password), usamos ese UID. Así no se crea
  // una segunda cuenta con el id interno del servidor (`usr_...`).
  let resolvedUid = uid;
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail) {
    try {
      const existing = await auth.getUserByEmail(cleanEmail);
      resolvedUid = existing.uid;
    } catch (error) {
      if (!isUserNotFound(error)) {
        console.warn(`No se pudo buscar ${cleanEmail} en Firebase Auth:`, error);
      }
    }
  }

  await ensureAuthUser(auth, resolvedUid, email, displayName);
  return auth.createCustomToken(resolvedUid);
}

/** Base que usa la app desplegada (la misma de firebase-applet-config.json). */
export function getFirestoreDatabaseId(): string {
  return (
    (process.env.FIRESTORE_DATABASE_ID || '').trim() ||
    firebaseConfig.firestoreDatabaseId ||
    '(default)'
  );
}

/**
 * Firestore con permisos de administrador. Devuelve null si Firebase Admin no
 * está configurado, para que la API pueda seguir funcionando con el JSON local
 * como respaldo.
 */
export function getFirebaseFirestore(): Firestore | null {
  const status = ensureInitialized();
  if (!status.ready || getApps().length === 0) return null;
  return getFirestore(getApps()[0], getFirestoreDatabaseId());
}
