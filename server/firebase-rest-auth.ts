import { createHash } from 'node:crypto';
import firebaseConfig from '../firebase-applet-config.json';

/**
 * Verificación de credenciales contra Firebase Auth usando la API pública
 * (Web API Key). No necesita cuenta de servicio ni permisos de IAM, así que
 * funciona incluso cuando el servidor no tiene credenciales de Google.
 *
 * Es el respaldo del login: si el JSON del servidor se reinició y perdió la
 * cuenta, Firebase Auth (que es permanente) sigue teniendo la identidad y el
 * usuario puede entrar igual.
 */

export interface FirebaseRestIdentity {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
}

/** Misma derivación que `src/lib/firebaseAuthBridge.ts`. */
export function deriveFirebasePassword(email: string, password: string): string {
  return `sl!${createHash('sha256')
    .update(`screenlog|${email.trim().toLowerCase()}|${password}`)
    .digest('hex')}`;
}

export async function verifyFirebasePassword(
  email: string,
  password: string,
): Promise<FirebaseRestIdentity | null> {
  const cleanEmail = email.trim().toLowerCase();
  const apiKey = (process.env.FIREBASE_WEB_API_KEY || firebaseConfig.apiKey || '').trim();
  if (!apiKey || !cleanEmail.includes('@') || !password) return null;

  const derived = deriveFirebasePassword(cleanEmail, password);
  const candidates = [derived];
  // Compatibilidad con identidades creadas con la contraseña original.
  if (password.length >= 6 && password !== derived) candidates.push(password);

  for (const candidate of candidates) {
    try {
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: candidate, returnSecureToken: true }),
        },
      );
      if (!response.ok) continue;
      const data = (await response.json()) as Record<string, unknown>;
      const uid = typeof data.localId === 'string' ? data.localId : '';
      if (!uid) continue;
      return {
        uid,
        email: typeof data.email === 'string' ? data.email : cleanEmail,
        displayName: typeof data.displayName === 'string' ? data.displayName : '',
        photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
      };
    } catch {
      // Sin red o respuesta inválida: se prueba el siguiente candidato.
    }
  }

  return null;
}
