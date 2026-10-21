import type { Request } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { DATA_DIR } from './store';

const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(expectedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

let cachedSecret: Buffer | null = null;

export async function getAppSecret(): Promise<Buffer> {
  if (cachedSecret) return cachedSecret;
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.trim().length >= 16) {
    cachedSecret = createHash('sha256').update(fromEnv).digest();
    return cachedSecret;
  }
  const secretFile = path.join(DATA_DIR, '.session-secret');
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const stored = await fs.readFile(secretFile, 'utf8');
    if (stored.trim().length >= 32) {
      cachedSecret = createHash('sha256').update(stored.trim()).digest();
      return cachedSecret;
    }
  } catch {
    // generated below
  }
  const generated = randomBytes(48).toString('hex');
  await fs.writeFile(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
  cachedSecret = createHash('sha256').update(generated).digest();
  return cachedSecret;
}

export async function encryptSecret(value: string): Promise<string> {
  if (!value) return '';
  const key = await getAppSecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export async function decryptSecret(payload: string): Promise<string> {
  if (!payload) return '';
  try {
    const [version, ivB64, tagB64, dataB64] = payload.split('.');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) return '';
    const key = await getAppSecret();
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

export function maskSecret(value: string): string {
  if (!value) return '';
  const visible = value.slice(-4);
  return `••••••••••••${visible}`;
}

export function sanitizeText(value: unknown, maxLength = 2000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength = 4000): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\r\n/g, '\n')
    .trim()
    .slice(0, maxLength);
}

export function redactSecrets(input: string): string {
  return input
    .replace(/(sk_(?:live|test)_[A-Za-z0-9]+)/g, 'sk_***REDACTED***')
    .replace(/(whsec_[A-Za-z0-9]+)/g, 'whsec_***REDACTED***')
    .replace(/(password\s*[=:]\s*)([^\s,;]+)/gi, '$1***REDACTED***')
    .replace(/(token\s*[=:]\s*)([^\s,;]+)/gi, '$1***REDACTED***')
    .replace(/(secret\s*[=:]\s*)([^\s,;]+)/gi, '$1***REDACTED***');
}

export function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const index = part.indexOf('=');
    if (index === -1) return acc;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) acc[key] = decodeURIComponent(value);
    return acc;
  }, {});
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'desconocida';
}

export function parseUserAgent(ua: string): { browser: string; os: string } {
  const userAgent = ua || '';
  let browser = 'Navegador desconocido';
  if (/Edg\//.test(userAgent)) browser = 'Microsoft Edge';
  else if (/OPR\/|Opera/.test(userAgent)) browser = 'Opera';
  else if (/Chrome\//.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//.test(userAgent)) browser = 'Safari';

  let os = 'Sistema desconocido';
  if (/Windows NT/.test(userAgent)) os = 'Windows';
  else if (/Android/.test(userAgent)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(userAgent)) os = 'iOS';
  else if (/Mac OS X/.test(userAgent)) os = 'macOS';
  else if (/Linux/.test(userAgent)) os = 'Linux';

  return { browser, os };
}

export function isOriginAllowed(req: Request): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;
  const appUrl = process.env.APP_URL;

  const candidates: string[] = [];
  if (origin) candidates.push(origin);
  else if (referer) candidates.push(referer);
  else return true;

  const allowedHosts = new Set<string>();
  if (host) allowedHosts.add(host);
  if (appUrl) {
    try {
      allowedHosts.add(new URL(appUrl).host);
    } catch {
      // ignore invalid APP_URL
    }
  }

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (allowedHosts.has(parsed.host)) return true;
    } catch {
      return false;
    }
  }
  return false;
}

interface AttemptWindow {
  count: number;
  firstAt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, AttemptWindow>();
const forgotAttempts = new Map<string, AttemptWindow>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkWindow(map: Map<string, AttemptWindow>, key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry) return { allowed: true, retryAfter: 0 };
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }
  if (now - entry.firstAt > WINDOW_MS) {
    map.delete(key);
    return { allowed: true, retryAfter: 0 };
  }
  return { allowed: true, retryAfter: 0 };
}

function registerFailure(map: Map<string, AttemptWindow>, key: string): number {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    map.set(key, { count: 1, firstAt: now, lockedUntil: 0 });
    return 0;
  }
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + WINDOW_MS;
  }
  return entry.count;
}

export function checkLoginRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  return checkWindow(loginAttempts, key);
}

export function registerLoginFailure(key: string): number {
  return registerFailure(loginAttempts, key);
}

export function clearLoginFailures(key: string): void {
  loginAttempts.delete(key);
}

export function checkForgotRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  return checkWindow(forgotAttempts, key);
}

export function registerForgotAttempt(key: string): void {
  registerFailure(forgotAttempts, key);
}

export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}
