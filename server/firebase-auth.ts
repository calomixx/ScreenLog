import { createPublicKey, verify as cryptoVerify, type KeyObject } from 'node:crypto';

// Google public keys (rotates them periodically, so we cache with a TTL)
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const KEY_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface GoogleKey {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
}

let cachedKeys: Record<string, KeyObject> = {};
let cachedAt = 0;

async function loadGooglePublicKeys(): Promise<Record<string, KeyObject>> {
  const now = Date.now();
  if (Object.keys(cachedKeys).length > 0 && now - cachedAt < KEY_CACHE_TTL_MS) {
    return cachedKeys;
  }
  try {
    const res = await fetch(GOOGLE_CERTS_URL, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { keys?: GoogleKey[] };
    const keys: Record<string, KeyObject> = {};
    for (const key of data.keys || []) {
      if (!key.kid || key.kty !== 'RSA') continue;
      keys[key.kid] = createPublicKey({
        key: {
          kty: 'RSA',
          n: key.n,
          e: key.e,
          alg: key.alg || 'RS256',
          ext: true,
        },
        format: 'jwk',
      });
    }
    if (Object.keys(keys).length === 0) throw new Error('No keys');
    cachedKeys = keys;
    cachedAt = now;
    return cachedKeys;
  } catch (error) {
    // If Google is unreachable, fall back to the last known keys instead of
    // locking every user out. Verification still uses the cached keys.
    if (Object.keys(cachedKeys).length > 0) return cachedKeys;
    throw error;
  }
}

export interface VerifiedGoogleClaims {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Verifies a Firebase/Google ID token (RS256) against Google's public keys.
 * Never trusts client-provided uid/email: both are read from the signed token.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  projectId: string,
): Promise<VerifiedGoogleClaims | null> {
  try {
    if (!idToken || typeof idToken !== 'string') return null;
    const parts = idToken.trim().split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;

    let header: { kid?: string; alg?: string };
    let payload: {
      aud?: string;
      iss?: string;
      exp?: number;
      iat?: number;
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      return null;
    }

    if (header.alg !== 'RS256' || !header.kid) return null;
    if (!projectId) return null;

    const keys = await loadGooglePublicKeys();
    const key = keys[header.kid];
    if (!key) return null;

    const signed = Buffer.from(`${parts[0]}.${parts[1]}`, 'utf8');
    const signature = Buffer.from(parts[2], 'base64url');
    if (!cryptoVerify('RSA-SHA256', signed, key, signature)) return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.aud !== projectId) return null;
    if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
    if (typeof payload.exp !== 'number' || payload.exp < now) return null;
    if (typeof payload.iat === 'number' && payload.iat > now + 60) return null;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;

    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
    if (!email || !email.includes('@')) return null;
    if (payload.email_verified === false) return null;

    return {
      uid: payload.sub,
      email,
      name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : undefined,
      picture:
        typeof payload.picture === 'string' && payload.picture.trim()
          ? payload.picture.trim()
          : undefined,
    };
  } catch {
    return null;
  }
}

/** Project id used to validate the `aud`/`iss` claims. */
export const FIREBASE_PROJECT_ID =
  (process.env.FIREBASE_PROJECT_ID || '').trim() || 'screeamlog';
