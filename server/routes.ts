import { Router, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { promises as dns } from 'node:dns';
import {
  getStore,
  saveStore,
  findUserByEmail,
  findUserById,
  ownerExists,
  publicUser,
  type Role,
  type SessionRecord,
  type StoreData,
  type StoredUser,
  type SystemLogRecord,
  type AuditRecord,
} from './store';
import {
  checkForgotRateLimit,
  checkLoginRateLimit,
  clearLoginFailures,
  decryptSecret,
  encryptSecret,
  generateSessionToken,
  generateTemporaryPassword,
  getClientIp,
  hashPassword,
  hashToken,
  isOriginAllowed,
  maskSecret,
  parseCookies,
  parseUserAgent,
  redactSecrets,
  registerForgotAttempt,
  registerLoginFailure,
  sanitizeMultiline,
  sanitizeText,
  verifyPassword,
} from './security';
import type { MediaItem, RewatchChoice, WatchStatus } from '../src/types';
import { INITIAL_MEDIA_LIST } from '../src/data/initialMedia';

interface AuthedRequest extends Request {
  authUser?: StoredUser;
  authSession?: SessionRecord;
}

const SESSION_COOKIE = 'sl_session';
const SESSION_DAYS_REMEMBER = 30;
const SESSION_DAYS_DEFAULT = 7;
const BCRYPT_MAX_PASSWORD = 200;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function asyncRoute(handler: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function setSessionCookie(res: Response, token: string, remember: boolean): void {
  const maxAge = (remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT) * 24 * 60 * 60 * 1000;
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    path: '/',
    maxAge,
  });
}

function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    path: '/',
  });
}

function safeSession(session: SessionRecord) {
  const { browser, os } = parseUserAgent(session.userAgent);
  return {
    id: session.id,
    browser,
    os,
    ip: session.ip,
    startedAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
  };
}

function isSessionExpired(session: SessionRecord): boolean {
  const days = session.remember ? SESSION_DAYS_REMEMBER : SESSION_DAYS_DEFAULT;
  const expiresAt = new Date(session.createdAt).getTime() + days * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

function addLog(
  store: StoreData,
  entry: Omit<SystemLogRecord, 'id' | 'createdAt'> & { message: string },
): void {
  store.logs.unshift({
    ...entry,
    id: randomUUID(),
    message: redactSecrets(entry.message),
    createdAt: new Date().toISOString(),
  });
  if (store.logs.length > 2000) store.logs.length = 2000;
}

function addAudit(
  store: StoreData,
  entry: Omit<AuditRecord, 'id' | 'createdAt'>,
): void {
  store.audit.unshift({
    ...entry,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  });
  if (store.audit.length > 2000) store.audit.length = 2000;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email);
}

function validatePassword(password: string): string | null {
  if (typeof password !== 'string' || password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.';
  }
  if (password.length > BCRYPT_MAX_PASSWORD) {
    return 'La contraseña es demasiado larga.';
  }
  return null;
}

function createUserRecord(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
  avatar?: string;
}): StoredUser {
  const now = new Date().toISOString();
  const { salt, hash } = hashPassword(input.password);
  return {
    id: randomUUID(),
    name: sanitizeText(input.name, 80) || 'Cinéfilo',
    email: input.email.trim().toLowerCase(),
    passwordHash: hash,
    salt,
    role: input.role,
    avatar:
      input.avatar && input.avatar.length < 800000
        ? input.avatar
        : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
    bio: '',
    favoriteGenres: [],
    city: '',
    platforms: [],
    socialLinks: {},
    customFields: [],
    blocked: false,
    mustChangePassword: false,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
  };
}

async function createSession(
  req: AuthedRequest,
  res: Response,
  store: StoreData,
  user: StoredUser,
  remember: boolean,
): Promise<{ session: SessionRecord; token: string }> {
  const token = generateSessionToken();
  const now = new Date().toISOString();
  const session: SessionRecord = {
    id: randomUUID(),
    tokenHash: hashToken(token),
    userId: user.id,
    createdAt: now,
    lastActivityAt: now,
    ip: getClientIp(req),
    userAgent: req.headers['user-agent'] || '',
    remember,
  };
  store.sessions.push(session);
  store.sessions = store.sessions.filter(
    (s) => !isSessionExpired(s) && findUserById(store, s.userId),
  );
  setSessionCookie(res, token, remember);
  return { session, token };
}

function detachSessionsForUser(store: StoreData, userId: string): void {
  store.sessions = store.sessions.filter((s) => s.userId !== userId);
}

function detachSession(req: AuthedRequest, store: StoreData): void {
  if (req.authSession) {
    store.sessions = store.sessions.filter((s) => s.id !== req.authSession?.id);
  }
}

function canManageTarget(actor: StoredUser, target: StoredUser): boolean {
  if (target.role === 'owner') return false;
  if (actor.role === 'owner') return true;
  if (actor.role === 'admin') return target.role === 'user';
  return false;
}

function safeError(res: Response, status: number, message: string, code?: string): void {
  res.status(status).json({ success: false, error: message, code });
}

function buildStats(store: StoreData) {
  const stats: Record<string, { total: number; votes: number; addedToList: number }> = {};
  const ensure = (id: string) => {
    if (!stats[id]) stats[id] = { total: 0, votes: 0, addedToList: 0 };
    return stats[id];
  };
  for (const entry of store.library) {
    const item = ensure(entry.mediaId);
    item.addedToList += 1;
    if (!entry.hidden && entry.review.status === 'terminada' && entry.review.stars > 0) {
      item.total += entry.review.stars;
      item.votes += 1;
    }
  }
  for (const review of store.reviews) {
    if (review.deleted || review.hidden) continue;
    const item = ensure(review.mediaId);
    item.total += review.rating;
    item.votes += 1;
  }
  return Object.fromEntries(
    Object.entries(stats).map(([id, value]) => [
      id,
      {
        average: value.votes > 0 ? Number((value.total / value.votes).toFixed(1)) : 0,
        votes: value.votes,
        addedToList: value.addedToList,
      },
    ]),
  );
}

function normalizeTitle(t: string): string {
  return (t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isVersionOrRemake(title1: string, year1: number, title2: string, year2: number): boolean {
  // If release years differ by 2 or more years, it's considered a remake/reboot from another era (e.g. 1984 vs 2021)
  if (Math.abs(year1 - year2) >= 2) {
    return true;
  }
  // Check for edition, cut or remake keywords in either title
  const variantKeywords = [
    'remake',
    'version extendida',
    'versión extendida',
    'extended',
    'director\'s cut',
    'directors cut',
    'corte del director',
    'montaje del director',
    'edicion especial',
    'edición especial',
    'special edition',
    'reboot',
    'remaster',
    'remastered',
    'remasterizada',
    'live action',
    'live-action',
    'ova',
    'uncut',
    'sin censura',
    'definitiva',
    'definitive',
    'final cut',
  ];
  const t1 = (title1 || '').toLowerCase();
  const t2 = (title2 || '').toLowerCase();
  return variantKeywords.some((kw) => t1.includes(kw) || t2.includes(kw));
}

function buildMediaFromBody(body: any, existing?: MediaItem): MediaItem {
  const mediaTypes = ['pelicula', 'serie', 'anime', 'documental'];
  const type = mediaTypes.includes(body.type) ? body.type : existing?.type || 'pelicula';
  const genres = Array.isArray(body.genres)
    ? body.genres
        .filter((genre: unknown) => typeof genre === 'string')
        .map((genre: string) => sanitizeText(genre, 40))
        .filter(Boolean)
        .slice(0, 12)
    : existing?.genres || ['Drama'];
  const cast = Array.isArray(body.cast)
    ? body.cast
        .filter((member: unknown) => typeof member === 'string')
        .map((member: string) => sanitizeText(member, 80))
        .filter(Boolean)
        .slice(0, 30)
    : existing?.cast || [];
  const platforms = Array.isArray(body.streamingPlatforms)
    ? body.streamingPlatforms
    : Array.isArray(body.platforms)
      ? body.platforms
      : [];
  const defaultPlatform =
    sanitizeText(body.defaultPlatform, 80) ||
    sanitizeText(platforms[0], 80) ||
    existing?.defaultPlatform ||
    'Otra';
  const posterUrl = typeof body.posterUrl === 'string' ? body.posterUrl.slice(0, 800000) : existing?.posterUrl || '';
  const backdropUrl =
    typeof body.backdropUrl === 'string' ? body.backdropUrl.slice(0, 800000) : existing?.backdropUrl || posterUrl;
  return {
    ...(existing || {}),
    id: existing?.id || sanitizeText(body.id, 120) || randomUUID(),
    title: sanitizeText(body.title, 200) || existing?.title || 'Sin título',
    originalTitle: sanitizeText(body.originalTitle, 200) || existing?.originalTitle || sanitizeText(body.title, 200),
    type,
    year: Math.max(1888, Math.min(2200, Number(body.year) || existing?.year || new Date().getFullYear())),
    genres,
    director: sanitizeText(body.director, 160) || existing?.director || 'Desconocido',
    cast,
    synopsis: sanitizeMultiline(body.synopsis, 4000) || existing?.synopsis || '',
    duration: sanitizeText(body.duration, 60) || existing?.duration || '2h 00m',
    posterUrl,
    backdropUrl,
    trailerYoutubeId:
      sanitizeText(body.trailerYoutubeId, 120) || sanitizeText(body.trailerUrl, 120) || existing?.trailerYoutubeId || '',
    defaultPlatform,
    communityRating: existing?.communityRating || 0,
    communityVotesCount: existing?.communityVotesCount || 0,
    addedToListCount: existing?.addedToListCount || 0,
    detailedVotes: existing?.detailedVotes || {
      script: 0,
      acting: 0,
      soundtrack: 0,
      visuals: 0,
      direction: 0,
      totalVotes: 0,
      ratingDistribution: {},
    },
    comments: existing?.comments || [],
    isFeatured: typeof body.isFeatured === 'boolean' ? body.isFeatured : Boolean(existing?.isFeatured),
    isTrending: typeof body.isTrending === 'boolean' ? body.isTrending : Boolean(existing?.isTrending),
    isTopClassified:
      typeof body.isTopClassified === 'boolean' ? body.isTopClassified : Boolean(existing?.isTopClassified),
    createdAt: existing?.createdAt || new Date().toISOString(),
    watchProviders: Array.isArray(body.watchProviders) ? body.watchProviders.slice(0, 100) : existing?.watchProviders,
    seasonsCount: Number(body.seasonsCount || body.seasons) || existing?.seasonsCount,
    episodesCount: Number(body.episodesCount || body.episodes) || existing?.episodesCount,
    releaseDate: sanitizeText(body.releaseDate, 40) || existing?.releaseDate,
    country: sanitizeText(body.country, 80) || existing?.country,
    language: sanitizeText(body.language, 80) || existing?.language,
    ageRating: sanitizeText(body.ageRating, 20) || existing?.ageRating,
    lastEditedBy: existing?.lastEditedBy,
    lastEditedAt: new Date().toISOString(),
  };
}

let lastSessionPersist = 0;

export const resolveSession = asyncRoute(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }
  if (!token && typeof req.headers['x-session-token'] === 'string') {
    token = req.headers['x-session-token'];
  }
  if (!token) {
    const cookies = parseCookies(req.headers.cookie);
    token = cookies[SESSION_COOKIE];
  }

  if (!token) {
    next();
    return;
  }
  const store = await getStore();
  const tokenHash = hashToken(token);
  const session = store.sessions.find((s) => s.tokenHash === tokenHash);
  if (!session || isSessionExpired(session)) {
    if (session) {
      store.sessions = store.sessions.filter((s) => s.id !== session.id);
      await saveStore();
    }
    clearSessionCookie(res);
    next();
    return;
  }
  const user = findUserById(store, session.userId);
  if (!user || user.blocked) {
    store.sessions = store.sessions.filter((s) => s.id !== session.id);
    await saveStore();
    clearSessionCookie(res);
    next();
    return;
  }
  session.lastActivityAt = new Date().toISOString();
  req.authUser = user;
  req.authSession = session;
  (req as any).authToken = token;
  if (Date.now() - lastSessionPersist > 60000) {
    lastSessionPersist = Date.now();
    saveStore().catch(() => undefined);
  }
  next();
});

export function createApiRouter(): Router {
  const router = Router();
  router.use(resolveSession);

  router.use((req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }
    if (!isOriginAllowed(req)) {
      safeError(res, 403, 'Origen de la petición no permitido.', 'INVALID_ORIGIN');
      return;
    }
    next();
  });

  const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      safeError(res, 401, 'Debes iniciar sesión para continuar.', 'UNAUTHENTICATED');
      return;
    }
    next();
  };

  const requireRole = (...roles: Role[]) =>
    (req: AuthedRequest, res: Response, next: NextFunction) => {
      if (!req.authUser) {
        safeError(res, 401, 'Debes iniciar sesión para continuar.', 'UNAUTHENTICATED');
        return;
      }
      if (!roles.includes(req.authUser.role)) {
        safeError(res, 403, 'No tienes permisos para realizar esta acción.', 'FORBIDDEN');
        return;
      }
      next();
    };

  const ownerOnly = requireRole('owner');
  const staffOnly = requireRole('owner', 'admin');

  router.get('/auth/status', asyncRoute(async (req, res) => {
    const store = await getStore();
    res.json({
      success: true,
      data: {
        needsSetup: !ownerExists(store),
        user: req.authUser ? publicUser(req.authUser) : null,
        session: req.authSession ? safeSession(req.authSession) : null,
        token: (req as any).authToken || null,
        settings: {
          portalName: store.settings.portalName,
          tagline: store.settings.tagline,
          allowPublicRegistration: store.settings.allowPublicRegistration,
        },
      },
    });
  }));

  router.get('/db-status', asyncRoute(async (_req, res) => {
    const store = await getStore();
    res.json({
      success: true,
      database: 'Almacenamiento JSON del servidor',
      counts: {
        users: store.users.length,
        media: store.media.length,
        myListEntries: store.library.length,
        reviews: store.reviews.filter((review) => !review.deleted).length,
        testimonials: store.testimonials.length,
        tickets: store.tickets.length,
      },
    });
  }));

  const TMDB_DEFAULT_KEY = '5aeed13f63f1071425b9ab7815b80949';

  function getValidTmdbKey(): string {
    const envKey = (process.env.TMDB_API_KEY || '').trim();
    if (/^[a-f0-9]{32}$/i.test(envKey)) {
      return envKey;
    }
    return TMDB_DEFAULT_KEY;
  }

  async function searchTMDB(query: string, type?: string): Promise<any[]> {
    const apiKey = getValidTmdbKey();
    const baseUrl = 'https://api.themoviedb.org/3';
    try {
      const searchUrl = `${baseUrl}/search/multi?query=${encodeURIComponent(query)}&language=es-ES&include_adult=false&api_key=${apiKey}`;
      const res = await fetch(searchUrl, { signal: AbortSignal.timeout(4500) });
      if (!res.ok) return [];
      const data = await res.json();
      const results = (data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');

      return results.slice(0, 8).map((r: any) => {
        const isMovie = r.media_type === 'movie';
        const isAnime = r.origin_country?.includes('JP') && (r.genre_ids?.includes(16) || type === 'anime');
        const inferredType = isAnime ? 'anime' : isMovie ? 'pelicula' : 'serie';
        const title = isMovie ? r.title || r.name : r.name || r.title;
        const originalTitle = isMovie ? r.original_title : r.original_name;
        const releaseYear = (r.release_date || r.first_air_date || '').slice(0, 4);

        return {
          id: `tmdb-${r.media_type}-${r.id}`,
          tmdbId: r.id,
          mediaType: r.media_type as 'movie' | 'tv',
          title,
          originalTitle: originalTitle || title,
          type: inferredType,
          year: Number(releaseYear) || new Date().getFullYear(),
          posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : '',
          backdropUrl: r.backdrop_path ? `https://image.tmdb.org/t/p/w1280${r.backdrop_path}` : '',
          synopsis: r.overview || '',
          source: 'tmdb',
        };
      });
    } catch {
      return [];
    }
  }

  router.get('/media', asyncRoute(async (_req, res) => {
    const store = await getStore();
    const items = [...store.media].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({ success: true, data: items });
  }));

  // GET /api/media/similar - real-time search & suggestions for autocompletion
  router.get('/media/similar', asyncRoute(async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const type = typeof req.query.type === 'string' ? req.query.type.trim() : undefined;
    if (!q || q.length < 2) {
      return res.json({ success: true, bestMatch: null, similar: [] });
    }

    const tmdbList = await searchTMDB(q, type);
    if (tmdbList.length > 0) {
      return res.json({
        success: true,
        bestMatch: tmdbList[0],
        similar: tmdbList.slice(1, 6),
      });
    }

    const store = await getStore().catch(() => null);
    const catalog = [...(store?.media || []), ...INITIAL_MEDIA_LIST];
    const normalized = q.toLowerCase();
    const localMatches = catalog.filter((m) => m.title.toLowerCase().includes(normalized)).slice(0, 5);
    res.json({
      success: true,
      bestMatch: localMatches[0] || null,
      similar: localMatches.slice(1),
    });
  }));

  router.get('/media/:id', asyncRoute(async (req, res) => {
    const store = await getStore();
    const id = sanitizeText(req.params.id, 120);
    const item = store.media.find((media) => media.id === id);
    if (!item) return safeError(res, 404, 'Título no encontrado.', 'MEDIA_NOT_FOUND');
    res.json({ success: true, data: item });
  }));

  // Media lookup / autofill with TMDB/Jikan fallback
  async function fetchFromTMDB(title: string, type?: string, year?: number) {
    const apiKey = getValidTmdbKey();
    const baseUrl = 'https://api.themoviedb.org/3';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const searchUrl = `${baseUrl}/search/multi?query=${encodeURIComponent(title)}&language=es-ES&include_adult=false&api_key=${apiKey}`;
      const searchRes = await fetch(searchUrl, { signal: controller.signal });
      if (!searchRes.ok) {
        console.warn(`TMDB search returned HTTP ${searchRes.status} for query "${title}"`);
        return null;
      }
      const searchData = await searchRes.json();
      const results = (searchData.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
      if (results.length === 0) return null;

      let bestMatch = results[0];
      for (const r of results) {
        if (type === 'anime' && r.media_type === 'tv' && r.origin_country?.includes('JP')) { bestMatch = r; break; }
        if (type === 'serie' && r.media_type === 'tv' && !r.origin_country?.includes('JP')) { bestMatch = r; break; }
        if (type === 'pelicula' && r.media_type === 'movie') { bestMatch = r; break; }
      }

      const mediaType = bestMatch.media_type === 'movie' ? 'movie' : 'tv';
      const detailUrl = `${baseUrl}/${mediaType}/${bestMatch.id}?language=es-ES&append_to_response=credits,videos,watch/providers,external_ids&api_key=${apiKey}`;
      const detailRes = await fetch(detailUrl, { signal: controller.signal });
      if (!detailRes.ok) {
        console.warn(`TMDB detail returned HTTP ${detailRes.status} for ID ${bestMatch.id}`);
        return null;
      }
      const detail = await detailRes.json();

      const crew = detail.credits?.crew || [];
      const director = crew.find((c: any) => c.job === 'Director')?.name ||
        (mediaType === 'tv' ? detail.created_by?.[0]?.name : null) || 'Desconocido';
      const cast = (detail.credits?.cast || []).slice(0, 6).map((c: any) => c.name);
      const genres = (detail.genres || []).map((g: any) => g.name);
      const videos = (detail.videos?.results || []).filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));
      const trailerYoutubeId = videos[0]?.key || '';

      const providers = detail['watch/providers']?.results?.ES?.flatrate || detail['watch/providers']?.results?.US?.flatrate || detail['watch/providers']?.results?.MX?.flatrate || [];
      const platformMap: Record<string, string> = {
        'Netflix': 'Netflix', 'HBO Max': 'Max (HBO)', 'Max': 'Max (HBO)',
        'Amazon Prime Video': 'Prime Video', 'Disney Plus': 'Disney+', 'Apple TV+': 'Apple TV+',
        'Crunchyroll': 'Crunchyroll'
      };
      const defaultPlatform = providers.length > 0
        ? (platformMap[providers[0].provider_name] || providers[0].provider_name) : 'Otra';

      const isAnime = detail.origin_country?.includes('JP') && genres.some((g: string) => g.toLowerCase().includes('anim'));
      const releaseYear = mediaType === 'movie'
        ? (detail.release_date ? new Date(detail.release_date).getFullYear() : new Date().getFullYear())
        : (detail.first_air_date ? new Date(detail.first_air_date).getFullYear() : new Date().getFullYear());

      return {
        title: mediaType === 'movie' ? detail.title : detail.name,
        originalTitle: mediaType === 'movie' ? detail.original_title : detail.original_name,
        type: isAnime ? 'anime' : (mediaType === 'movie' ? 'pelicula' : 'serie'),
        year: releaseYear,
        director,
        cast,
        genres: genres.length > 0 ? genres : ['Drama'],
        synopsis: detail.overview || '',
        duration: mediaType === 'movie'
          ? `${Math.floor((detail.runtime || 120) / 60)}h ${(detail.runtime || 120) % 60}m`
          : `${detail.number_of_seasons || 1} Temporadas (${detail.number_of_episodes || 0} eps)`,
        defaultPlatform,
        trailerYoutubeId,
        posterUrl: detail.poster_path ? `https://image.tmdb.org/t/p/w780${detail.poster_path}` : '',
        backdropUrl: detail.backdrop_path ? `https://image.tmdb.org/t/p/w1280${detail.backdrop_path}` : '',
        seasonsCount: mediaType === 'tv' ? detail.number_of_seasons : 0,
        episodesCount: mediaType === 'tv' ? detail.number_of_episodes : 0,
        releaseDate: mediaType === 'movie' ? detail.release_date : detail.first_air_date,
        country: detail.origin_country?.[0] || 'US',
        language: detail.original_language || 'es',
        confidence: 0.95,
        source: 'tmdb',
        createdByUserId: undefined
      };
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('TMDB lookup failed:', e?.message || e);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function fetchFromJikan(title: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const url = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw=1`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      const anime = data.data?.[0];
      if (!anime) return null;

      const genres = (anime.genres || []).map((g: any) => g.name);
      const studios = (anime.studios || []).map((s: any) => s.name);

      return {
        title: anime.title,
        originalTitle: anime.title_japanese || anime.title_english || anime.title,
        type: 'anime' as const,
        year: anime.year || new Date().getFullYear(),
        director: studios[0] || 'Desconocido',
        cast: (anime.characters || []).slice(0, 6).map((c: any) => c.character?.name || ''),
        genres: genres.length > 0 ? genres : ['Animación', 'Anime'],
        synopsis: anime.synopsis || '',
        duration: anime.episodes ? `${anime.episodes} eps` : 'Desconocido',
        defaultPlatform: 'Crunchyroll',
        trailerYoutubeId: anime.trailer?.youtube_id || '',
        posterUrl: anime.images?.jpg?.large_image_url || '',
        backdropUrl: anime.images?.jpg?.large_image_url || '',
        episodesCount: anime.episodes || 0,
        seasonsCount: 1,
        releaseDate: anime.aired?.from?.split('T')[0],
        country: 'JP',
        language: 'ja',
        confidence: 0.85,
        source: 'jikan',
        createdByUserId: undefined
      };
    } catch (e) {
      console.warn('Jikan lookup failed:', e);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function localFallbackLookup(title: string) {
    const { INITIAL_MEDIA_LIST } = await import('../src/data/initialMedia');
    const normalized = title.trim().toLowerCase();
    for (const media of INITIAL_MEDIA_LIST) {
      if (media.title.toLowerCase().includes(normalized) || normalized.includes(media.title.toLowerCase())) {
        return { 
          ...media, 
          originalTitle: media.originalTitle || media.title,
          duration: media.duration || '2h 00m',
          trailerYoutubeId: media.trailerYoutubeId || '',
          seasonsCount: media.seasonsCount ?? 0,
          episodesCount: media.episodesCount ?? 0,
          releaseDate: media.releaseDate || '',
          country: media.country || '',
          language: media.language || '',
          ageRating: media.ageRating || '',
          status: media.status || '',
          tags: media.tags || [],
          customFields: media.customFields || [],
          lastEditedBy: media.lastEditedBy || '',
          lastEditedAt: media.lastEditedAt || '',
          editHistory: media.editHistory || [],
          createdByUserId: media.createdByUserId || '',
          watchProviders: media.watchProviders || [],
          streamingPlatforms: media.streamingPlatforms || [media.defaultPlatform],
          confidence: 0.3, 
          source: 'local', 
          partial: true, 
          message: 'Coincidencia local (revisa los datos)' 
        };
      }
    }
    return null;
  }

  // POST /api/media/lookup - main lookup endpoint (no auth required for AI Studio compatibility)
  router.post('/media/lookup', asyncRoute(async (req, res) => {
    const { title, type, year } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return safeError(res, 400, 'El título debe tener al menos 2 caracteres.', 'INVALID_TITLE');
    }

    let result = await fetchFromTMDB(title.trim(), type, year);
    if ((!result || result.confidence < 0.7) && (type === 'anime' || !type)) {
      const jikanResult = await fetchFromJikan(title.trim());
      if (jikanResult && (!result || jikanResult.confidence > result.confidence)) result = jikanResult;
    }
    if (!result) result = await localFallbackLookup(title.trim());

    if (!result) {
      return res.json({ success: true, data: null, message: 'No encontramos coincidencias. Completa la ficha manualmente.' });
    }
    res.json({ success: true, data: result });
  }));

  // POST /api/autofill - alias for compatibility
  router.post('/autofill', asyncRoute(async (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      return safeError(res, 400, 'El título debe tener al menos 2 caracteres para autocompletar.', 'INVALID_TITLE');
    }
    let result = await fetchFromTMDB(title.trim());
    if (!result) result = await fetchFromJikan(title.trim());
    if (!result) result = await localFallbackLookup(title.trim());
    if (!result) {
      return res.json({ success: true, data: null, message: 'No encontramos coincidencias. Completa la ficha manualmente.' });
    }
    res.json({ success: true, data: result });
  }));

  // POST /api/assistant - AI Assistant (Gemini)
  router.post('/assistant', requireAuth, asyncRoute(async (req, res) => {
    const { message, history = [], context = {} } = req.body;
    if (!message || typeof message !== 'string') {
      return safeError(res, 400, 'Mensaje requerido.', 'INVALID_MESSAGE');
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.json({ success: true, reply: 'El asistente IA no está configurado (falta GEMINI_API_KEY). Puedo ayudarte con información básica sobre la app.' });
    }

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const systemInstruction = `Eres "ScreenLog AI", el asistente oficial de ScreenLog Pro. Ayuda a los usuarios a navegar la app, usar sus funciones y dar recomendaciones cinéfilas.
Contexto: Usuario ${context.userName || 'Usuario'}, pestaña activa: ${context.activeTab || 'inicio'}, títulos en lista: ${context.listCount || 0}.
Responde en español, tono amable y cinéfilo.`;

      const contents = [
        ...history.slice(-6).map((h: any) => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(h.text || h.content || '') }] })),
        { role: 'user', parts: [{ text: message }] },
      ];

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents,
        config: { systemInstruction, temperature: 0.7 },
      });

      const replyText = geminiResponse.text || '';
      if (replyText.trim()) return res.json({ success: true, reply: replyText });
    } catch (e) {
      console.warn('Gemini assistant error:', e);
    }

    const q = message.toLowerCase();
    let fallbackReply = '👋 ¡Hola! Soy ScreenLog AI. Puedo ayudarte con la app. Pregúntame sobre cómo añadir títulos, usar filtros, ver estadísticas o recomendar películas.';

    if (q.includes('lista') || q.includes('agregar') || q.includes('añadir')) {
      fallbackReply = '🎬 **Cómo agregar a Mi Lista:**\n1. Ve a Explorar o Inicio y haz clic en cualquier título.\n2. Selecciona estado: Pendiente, En Proceso o Terminada.\n3. Si es Terminada, podrás calificar, añadir plataforma, fecha y escribir tu crítica.\n4. Pulsa "Mi Lista" en la navbar para ver tu colección.';
    } else if (q.includes('filtro') || q.includes('catalogo') || q.includes('año') || q.includes('género')) {
      fallbackReply = '🔍 **Filtros del Catálogo:**\n- Género: píldoras rápidas (Ciencia Ficción, Drama, etc.)\n- Año: décadas (2020s, 2010s) o año exacto\n- Calificación mínima: 3.0+, 4.0+, 4.5+, 4.8+\n- Plataforma: Netflix, Max, Prime, Disney+, etc.\n- Orden: por rating, popularidad, año, título\n- Botón "Restablecer" para limpiar filtros.';
    } else if (q.includes('estadística') || q.includes('gráfico')) {
      fallbackReply = '📊 **Panel de Estadísticas:**\n- Gráfico de barras (Recharts) con películas vistas por género\n- Filtros: Vistas/Terminadas, Solo Películas, Toda Mi Lista\n- Tooltips con estrellas promedio\n- Click en barra para desglose interactivo';
    } else if (q.includes('recomiend') || q.includes('qué ver')) {
      fallbackReply = '🍿 **Recomendaciones:**\n1. **Oppenheimer (2023)** - Drama/Historia 4.8★ (Max)\n2. **Dune: Parte Dos (2024)** - Ciencia Ficción 4.9★\n3. **Spider-Man: A Través del Spider-Verso (2023)** - Animación 4.8★\n4. **Interestelar (2014)** - Ciencia Ficción 4.9★\n5. **El Viaje de Chihiro (2001)** - Anime 4.9★\n¿Buscas algún género específico?';
    }

    res.json({ success: true, reply: fallbackReply });
  }));

  router.post('/media', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    if (!sanitizeText(req.body?.title, 200)) {
      return safeError(res, 400, 'El título es obligatorio.', 'INVALID_TITLE');
    }
    const item = buildMediaFromBody(req.body);

    // Duplicate check: prevent duplicate movies/series unless remake (different year) or extended version
    const normalizedNewTitle = normalizeTitle(item.title);
    const allCatalog = [...store.media, ...INITIAL_MEDIA_LIST];
    const existing = allCatalog.find((m) => {
      if (m.id === item.id) return false;
      const normalizedExisting = normalizeTitle(m.title);
      return normalizedExisting === normalizedNewTitle && m.type === item.type;
    });

    if (existing) {
      const isRemakeOfOtherEra = Math.abs(item.year - existing.year) >= 2;
      if (!isRemakeOfOtherEra) {
        return safeError(
          res,
          409,
          `Ya existe la obra "${existing.title}" (${existing.year}) en el catálogo. Para registrarla nuevamente, debe tratarse de un remake (año distinto) o especificar la variante en el título (ej: 'Versión Extendida', 'Director's Cut').`,
          'MEDIA_DUPLICATE',
        );
      }
    }
    item.createdByUserId = user.id;
    item.isCustomUserCreated = true;
    item.lastEditedBy = user.id;
    store.media.unshift(item);
    addAudit(store, {
      actorId: user.id,
      actorName: user.name,
      action: 'catalog.create',
      targetType: 'media',
      targetId: item.id,
      targetName: item.title,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: item });
  }));

  router.patch('/media/:id', requireCatalogEditor, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    const id = sanitizeText(req.params.id, 120);
    const index = store.media.findIndex((media) => media.id === id);
    if (index === -1) return safeError(res, 404, 'Título no encontrado.', 'MEDIA_NOT_FOUND');
    const update = buildMediaFromBody(req.body, store.media[index]);
    update.lastEditedBy = user.id;
    store.media[index] = update;
    addAudit(store, {
      actorId: user.id,
      actorName: user.name,
      action: 'catalog.update',
      targetType: 'media',
      targetId: update.id,
      targetName: update.title,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: update });
  }));

  router.get('/testimonials', asyncRoute(async (_req, res) => {
    const store = await getStore();
    const items = [...store.testimonials].sort(
      (a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt),
    );
    res.json({ success: true, data: items });
  }));

  router.post('/testimonials', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    const content = sanitizeMultiline(req.body?.content, 1200);
    if (!content) return safeError(res, 400, 'Escribe tu opinión.', 'INVALID_CONTENT');
    const rating = Number(req.body?.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return safeError(res, 400, 'Selecciona una calificación de 1 a 5.', 'INVALID_RATING');
    }
    const testimonial = {
      id: randomUUID(),
      userId: user.id,
      userName: user.name,
      userAvatar: user.avatar,
      userRole: user.role,
      rating: Math.round(rating),
      highlightFeature: sanitizeText(req.body?.highlightFeature, 100) || 'General',
      content,
      dateStr: 'Hoy',
      likes: 0,
      createdAt: new Date().toISOString(),
    };
    store.testimonials.unshift(testimonial);
    if (store.testimonials.length > 500) store.testimonials.length = 500;
    await saveStore();
    res.json({ success: true, data: testimonial });
  }));

  router.post('/contact', asyncRoute(async (req, res) => {
    const store = await getStore();
    const name = sanitizeText(req.body?.name, 100);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const subject = sanitizeText(req.body?.subject, 160);
    const message = sanitizeMultiline(req.body?.message, 4000);
    if (!name || !message) return safeError(res, 400, 'Nombre y mensaje son obligatorios.', 'INVALID_TICKET');
    if (!validateEmail(email)) return safeError(res, 400, 'El correo no es válido.', 'INVALID_EMAIL');
    const ticket = {
      id: randomUUID(),
      ticketCode: `SL-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: req.authUser?.id || null,
      name,
      email,
      subject: subject || 'Consulta general',
      message,
      urgency: req.body?.urgency === 'alta' ? ('alta' as const) : ('normal' as const),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    store.tickets.unshift(ticket);
    if (store.tickets.length > 1000) store.tickets.length = 1000;
    await saveStore();
    res.json({ success: true, data: ticket });
  }));

  router.post('/auth/setup', asyncRoute(async (req, res) => {
    const store = await getStore();
    if (ownerExists(store)) {
      safeError(res, 409, 'La plataforma ya tiene un propietario configurado.', 'SETUP_COMPLETED');
      return;
    }
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name) return safeError(res, 400, 'Indica tu nombre.', 'INVALID_NAME');
    if (!validateEmail(email)) return safeError(res, 400, 'El correo no es válido.', 'INVALID_EMAIL');
    const passwordError = validatePassword(password);
    if (passwordError) return safeError(res, 400, passwordError, 'INVALID_PASSWORD');

    const user = createUserRecord({ name, email, password, role: 'owner' });
    store.users.push(user);
    store.settings.updatedAt = new Date().toISOString();
    store.settings.updatedBy = user.id;
    const { session, token } = await createSession(req, res, store, user, true);
    addLog(store, {
      level: 'security',
      category: 'auth',
      message: `Configuración inicial completada. Owner creado: ${email}`,
      actorId: user.id,
      actorName: user.name,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: user.id,
      actorName: user.name,
      action: 'ownership.setup',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: { user: publicUser(user), session: safeSession(session), token } });
  }));

  router.post('/auth/register', asyncRoute(async (req, res) => {
    const store = await getStore();
    if (!store.settings.allowPublicRegistration) {
      safeError(res, 403, 'El registro público está deshabilitado.', 'REGISTRATION_DISABLED');
      return;
    }
    const name = sanitizeText(req.body?.name, 80);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name) return safeError(res, 400, 'Indica tu nombre.', 'INVALID_NAME');
    if (!validateEmail(email)) return safeError(res, 400, 'El correo no es válido.', 'INVALID_EMAIL');
    const passwordError = validatePassword(password);
    if (passwordError) return safeError(res, 400, passwordError, 'INVALID_PASSWORD');
    if (findUserByEmail(store, email)) {
      return safeError(res, 409, 'Ya existe una cuenta con este correo.', 'EMAIL_IN_USE');
    }
    const user = createUserRecord({
      name,
      email,
      password,
      role: 'user',
      avatar: typeof req.body?.avatar === 'string' ? req.body.avatar : undefined,
    });
    store.users.push(user);
    const { session, token } = await createSession(req, res, store, user, false);
    addLog(store, {
      level: 'info',
      category: 'auth',
      message: `Nueva cuenta registrada: ${email}`,
      actorId: user.id,
      actorName: user.name,
      ip: getClientIp(req),
    });
    await saveStore();
    res.json({ success: true, data: { user: publicUser(user), session: safeSession(session), token } });
  }));

  router.post('/auth/login', asyncRoute(async (req, res) => {
    const store = await getStore();
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const remember = Boolean(req.body?.remember);
    const ip = getClientIp(req);
    const rateKey = `${ip}:${email}`;

    const rate = checkLoginRateLimit(rateKey);
    if (!rate.allowed) {
      addLog(store, {
        level: 'security',
        category: 'security',
        message: `Bloqueo temporal por intentos fallidos para ${email || 'correo vacío'}`,
        ip,
      });
      await saveStore();
      res.setHeader('Retry-After', String(rate.retryAfter));
      safeError(res, 429, 'Demasiados intentos. Inténtalo de nuevo más tarde.', 'RATE_LIMITED');
      return;
    }

    const user = findUserByEmail(store, email);
    if (!user) {
      registerLoginFailure(rateKey);
      addLog(store, {
        level: 'warning',
        category: 'security',
        message: `Inicio de sesión fallido: cuenta inexistente (${email || 'vacío'})`,
        ip,
      });
      await saveStore();
      return safeError(res, 401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
    }
    if (user.blocked) {
      addLog(store, {
        level: 'security',
        category: 'security',
        message: `Intento de acceso de cuenta bloqueada: ${user.email}`,
        actorId: user.id,
        actorName: user.name,
        ip,
      });
      await saveStore();
      return safeError(res, 403, 'Esta cuenta está bloqueada.', 'ACCOUNT_BLOCKED');
    }
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      const retry = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retry));
      return safeError(res, 429, 'Cuenta bloqueada temporalmente por intentos fallidos.', 'TEMPORARILY_LOCKED');
    }

    const valid = verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) {
      user.failedLoginCount += 1;
      if (user.failedLoginCount >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        user.failedLoginCount = 0;
      }
      registerLoginFailure(rateKey);
      addLog(store, {
        level: 'warning',
        category: 'security',
        message: `Inicio de sesión fallido para ${user.email}`,
        actorId: user.id,
        actorName: user.name,
        ip,
      });
      await saveStore();
      return safeError(res, 401, 'Correo o contraseña incorrectos.', 'INVALID_CREDENTIALS');
    }

    clearLoginFailures(rateKey);
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date().toISOString();
    const { session, token } = await createSession(req, res, store, user, remember);
    addLog(store, {
      level: 'info',
      category: 'auth',
      message: `Inicio de sesión correcto: ${user.email}`,
      actorId: user.id,
      actorName: user.name,
      ip,
    });
    await saveStore();
    res.json({
      success: true,
      data: {
        user: publicUser(user),
        session: safeSession(session),
        token,
        mustChangePassword: user.mustChangePassword,
      },
    });
  }));

  router.post('/auth/forgot-password', asyncRoute(async (req, res) => {
    const ip = getClientIp(req);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const rate = checkForgotRateLimit(`${ip}:forgot`);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfter));
      safeError(res, 429, 'Demasiadas solicitudes. Inténtalo más tarde.', 'RATE_LIMITED');
      return;
    }
    registerForgotAttempt(`${ip}:forgot`);
    const store = await getStore();
    const user = findUserByEmail(store, email);
    if (user) {
      addLog(store, {
        level: 'security',
        category: 'security',
        message: `Solicitud de recuperación de contraseña para ${user.email}`,
        actorId: user.id,
        actorName: user.name,
        ip,
      });
      await saveStore();
    }
    res.json({
      success: true,
      message:
        'Si el correo existe en ScreenLog Pro, un administrador podrá restablecer la contraseña de forma segura.',
    });
  }));

  router.post('/auth/logout', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    if (req.authUser) {
      addLog(store, {
        level: 'info',
        category: 'auth',
        message: `Cierre de sesión: ${req.authUser.email}`,
        actorId: req.authUser.id,
        actorName: req.authUser.name,
        ip: getClientIp(req),
      });
    }
    detachSession(req, store);
    await saveStore();
    clearSessionCookie(res);
    res.json({ success: true });
  }));

  router.post('/auth/logout-all', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    if (!req.authUser) return;
    detachSessionsForUser(store, req.authUser.id);
    addLog(store, {
      level: 'security',
      category: 'auth',
      message: `Se cerraron todas las sesiones de ${req.authUser.email}`,
      actorId: req.authUser.id,
      actorName: req.authUser.name,
      ip: getClientIp(req),
    });
    await saveStore();
    clearSessionCookie(res);
    res.json({ success: true });
  }));

  router.get('/auth/me', requireAuth, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.authUser ? publicUser(req.authUser) : null,
        session: req.authSession ? safeSession(req.authSession) : null,
      },
    });
  }));

  router.get('/auth/session', requireAuth, asyncRoute(async (req, res) => {
    res.json({
      success: true,
      data: {
        session: req.authSession ? safeSession(req.authSession) : null,
      },
    });
  }));

  router.post('/auth/change-password', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!verifyPassword(currentPassword, user.salt, user.passwordHash)) {
      return safeError(res, 401, 'La contraseña actual no es correcta.', 'INVALID_PASSWORD');
    }
    const passwordError = validatePassword(newPassword);
    if (passwordError) return safeError(res, 400, passwordError, 'INVALID_PASSWORD');
    if (currentPassword === newPassword) {
      return safeError(res, 400, 'La nueva contraseña debe ser diferente.', 'SAME_PASSWORD');
    }
    const { salt, hash } = hashPassword(newPassword);
    user.salt = salt;
    user.passwordHash = hash;
    user.mustChangePassword = false;
    user.updatedAt = new Date().toISOString();
    const currentSessionId = req.authSession?.id;
    store.sessions = store.sessions.filter(
      (s) => s.userId !== user.id || s.id === currentSessionId,
    );
    addLog(store, {
      level: 'security',
      category: 'auth',
      message: `Contraseña actualizada por ${user.email}`,
      actorId: user.id,
      actorName: user.name,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: user.id,
      actorName: user.name,
      action: 'auth.password_change',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, message: 'Contraseña actualizada correctamente.' });
  }));

  router.use((req: AuthedRequest, res, next) => {
    if (req.authUser?.mustChangePassword) {
      safeError(
        res,
        403,
        'Debes cambiar tu contraseña antes de continuar.',
        'PASSWORD_CHANGE_REQUIRED',
      );
      return;
    }
    next();
  });

  router.patch('/me/profile', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    const body = req.body || {};
    if (typeof body.name === 'string' && sanitizeText(body.name, 80)) {
      user.name = sanitizeText(body.name, 80);
    }
    if (typeof body.bio === 'string') user.bio = sanitizeMultiline(body.bio, 500);
    if (typeof body.city === 'string') user.city = sanitizeText(body.city, 120);
    if (typeof body.avatar === 'string' && body.avatar.length < 800000) user.avatar = body.avatar;
    if (Array.isArray(body.favoriteGenres)) {
      user.favoriteGenres = body.favoriteGenres
        .filter((g: unknown) => typeof g === 'string')
        .map((g: string) => sanitizeText(g, 40))
        .filter(Boolean)
        .slice(0, 20);
    }
    if (Array.isArray(body.platforms)) {
      user.platforms = body.platforms
        .filter((p: unknown) => typeof p === 'string')
        .map((p: string) => sanitizeText(p, 40))
        .filter(Boolean)
        .slice(0, 20);
    }
    if (body.socialLinks && typeof body.socialLinks === 'object') {
      user.socialLinks = {
        letterboxd: sanitizeText(body.socialLinks.letterboxd, 200),
        instagram: sanitizeText(body.socialLinks.instagram, 200),
        twitter: sanitizeText(body.socialLinks.twitter, 200),
      };
    }
    if (Array.isArray(body.customFields)) {
      user.customFields = body.customFields
        .filter((f: unknown) => f && typeof f === 'object')
        .map((f: { id?: unknown; label?: unknown; value?: unknown }) => ({
          id: typeof f.id === 'string' ? sanitizeText(f.id, 60) : randomUUID(),
          label: sanitizeText(f.label, 60),
          value: sanitizeText(f.value, 200),
        }))
        .filter((f) => f.label)
        .slice(0, 12);
    }
    user.updatedAt = new Date().toISOString();
    await saveStore();
    res.json({ success: true, data: { user: publicUser(user) } });
  }));

  router.get('/me/library', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    if (!req.authUser) return;
    const entries = store.library.filter((e) => e.userId === req.authUser?.id);
    const reviews: Record<string, unknown> = {};
    for (const entry of entries) {
      reviews[entry.mediaId] = { ...entry.review, hidden: entry.hidden };
    }
    res.json({ success: true, data: reviews });
  }));

  router.put('/me/library/:mediaId', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    const mediaId = sanitizeText(req.params.mediaId, 120);
    if (!mediaId) return safeError(res, 400, 'Título no válido.', 'INVALID_MEDIA');
    const body = req.body?.review || req.body || {};
    const statuses: WatchStatus[] = ['pendiente', 'en_proceso', 'terminada'];
    const status: WatchStatus = statuses.includes(body.status) ? body.status : 'pendiente';
    const stars = Math.max(0, Math.min(5, Number(body.stars) || 0));
    const rewatchOptions: RewatchChoice[] = ['si_totalmente', 'quizas', 'no_suficiente', 'jamas'];
    const wouldRewatch: RewatchChoice = rewatchOptions.includes(body.wouldRewatch)
      ? body.wouldRewatch
      : 'quizas';
    const review = {
      mediaId,
      status,
      stars,
      year: Number(body.year) || new Date().getFullYear(),
      genres: Array.isArray(body.genres)
        ? body.genres.filter((g: unknown) => typeof g === 'string').map((g: string) => sanitizeText(g, 40)).slice(0, 12)
        : [],
      evaluation: sanitizeText(body.evaluation, 80),
      critique: sanitizeMultiline(body.critique, 4000),
      director: sanitizeText(body.director, 120),
      watchedDate: sanitizeText(body.watchedDate, 20),
      platform: sanitizeText(body.platform, 80),
      wouldRewatch,
      favoriteMoment: sanitizeText(body.favoriteMoment, 500),
      updatedAt: new Date().toISOString(),
    };
    const existing = store.library.find((e) => e.userId === user.id && e.mediaId === mediaId);
    if (existing) {
      existing.review = review;
      existing.updatedAt = review.updatedAt;
      existing.hidden = false;
    } else {
      store.library.push({
        id: randomUUID(),
        userId: user.id,
        mediaId,
        review,
        hidden: false,
        updatedAt: review.updatedAt,
      });
    }
    await saveStore();
    res.json({ success: true, data: review });
  }));

  router.delete('/me/library/:mediaId', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    if (!req.authUser) return;
    const mediaId = sanitizeText(req.params.mediaId, 120);
    store.library = store.library.filter(
      (e) => !(e.userId === req.authUser?.id && e.mediaId === mediaId),
    );
    await saveStore();
    res.json({ success: true });
  }));

  router.get('/community/reviews', asyncRoute(async (req, res) => {
    const store = await getStore();
    const mediaId = sanitizeText(req.query.mediaId, 120);
    const items = store.reviews
      .filter((r) => !r.hidden && !r.deleted && (!mediaId || r.mediaId === mediaId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 500)
      .map((r) => ({
        id: r.id,
        mediaId: r.mediaId,
        author: r.author,
        avatar: r.avatar,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.slice(0, 10),
        createdAt: r.createdAt,
        likes: r.likes,
      }));
    res.json({ success: true, data: items });
  }));

  router.post('/community/reviews', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    if (!store.settings.communityCommentsEnabled) {
      return safeError(res, 403, 'Los comentarios de la comunidad están desactivados.', 'COMMENTS_DISABLED');
    }
    const mediaId = sanitizeText(req.body?.mediaId, 120);
    const comment = sanitizeMultiline(req.body?.comment, 2000);
    const rating = Math.max(1, Math.min(5, Math.round(Number(req.body?.rating) || 5)));
    if (!mediaId) return safeError(res, 400, 'Título no válido.', 'INVALID_MEDIA');
    if (!comment) return safeError(res, 400, 'Escribe un comentario.', 'INVALID_COMMENT');
    const record = {
      id: randomUUID(),
      mediaId,
      userId: user.id,
      author: user.name,
      avatar: user.avatar,
      rating,
      comment,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedBy: [] as string[],
      hidden: false,
      deleted: false,
    };
    store.reviews.push(record);
    await saveStore();
    res.json({
      success: true,
      data: {
        id: record.id,
        mediaId: record.mediaId,
        author: record.author,
        avatar: record.avatar,
        rating: record.rating,
        comment: record.comment,
        date: record.createdAt.slice(0, 10),
        createdAt: record.createdAt,
        likes: 0,
      },
    });
  }));

  router.post('/community/reviews/:id/like', requireAuth, asyncRoute(async (req, res) => {
    const store = await getStore();
    const user = req.authUser;
    if (!user) return;
    const review = store.reviews.find((r) => r.id === req.params.id && !r.deleted);
    if (!review) return safeError(res, 404, 'Comentario no encontrado.', 'NOT_FOUND');
    const index = review.likedBy.indexOf(user.id);
    let liked: boolean;
    if (index >= 0) {
      review.likedBy.splice(index, 1);
      liked = false;
    } else {
      review.likedBy.push(user.id);
      liked = true;
    }
    review.likes = review.likedBy.length;
    await saveStore();
    res.json({ success: true, data: { liked, likes: review.likes } });
  }));

  router.get('/community/stats', asyncRoute(async (_req, res) => {
    const store = await getStore();
    res.json({ success: true, data: buildStats(store) });
  }));

  router.get('/settings/public', asyncRoute(async (_req, res) => {
    const store = await getStore();
    res.json({
      success: true,
      data: {
        portalName: store.settings.portalName,
        tagline: store.settings.tagline,
        logoUrl: store.settings.logoUrl,
        communityCommentsEnabled: store.settings.communityCommentsEnabled,
        allowPublicRegistration: store.settings.allowPublicRegistration,
      },
    });
  }));

  router.get('/admin/users', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const search = sanitizeText(req.query.search, 100).toLowerCase();
    const roleFilter = sanitizeText(req.query.role, 20);
    const statusFilter = sanitizeText(req.query.status, 20);
    const items = store.users
      .filter((u) => {
        if (search && !`${u.name} ${u.email}`.toLowerCase().includes(search)) return false;
        if (roleFilter && u.role !== roleFilter) return false;
        if (statusFilter === 'blocked' && !u.blocked) return false;
        if (statusFilter === 'active' && u.blocked) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((u) => ({
        ...publicUser(u),
        sessionsCount: store.sessions.filter((s) => s.userId === u.id).length,
      }));
    res.json({ success: true, data: items });
  }));

  router.post('/admin/users/:id/block', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    const target = findUserById(store, req.params.id);
    if (!actor) return;
    if (!target) return safeError(res, 404, 'Usuario no encontrado.', 'NOT_FOUND');
    if (!canManageTarget(actor, target)) {
      return safeError(res, 403, 'No puedes gestionar este usuario.', 'FORBIDDEN');
    }
    target.blocked = true;
    target.updatedAt = new Date().toISOString();
    detachSessionsForUser(store, target.id);
    addLog(store, {
      level: 'security',
      category: 'admin',
      message: `Usuario bloqueado: ${target.email}`,
      actorId: actor.id,
      actorName: actor.name,
      target: target.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'user.block',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: publicUser(target) });
  }));

  router.post('/admin/users/:id/unblock', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    const target = findUserById(store, req.params.id);
    if (!actor) return;
    if (!target) return safeError(res, 404, 'Usuario no encontrado.', 'NOT_FOUND');
    if (!canManageTarget(actor, target)) {
      return safeError(res, 403, 'No puedes gestionar este usuario.', 'FORBIDDEN');
    }
    target.blocked = false;
    target.failedLoginCount = 0;
    target.lockedUntil = null;
    target.updatedAt = new Date().toISOString();
    addLog(store, {
      level: 'info',
      category: 'admin',
      message: `Usuario desbloqueado: ${target.email}`,
      actorId: actor.id,
      actorName: actor.name,
      target: target.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'user.unblock',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: publicUser(target) });
  }));

  router.post('/admin/users/:id/reset-password', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    const target = findUserById(store, req.params.id);
    if (!actor) return;
    if (!target) return safeError(res, 404, 'Usuario no encontrado.', 'NOT_FOUND');
    if (!canManageTarget(actor, target)) {
      return safeError(res, 403, 'No puedes gestionar este usuario.', 'FORBIDDEN');
    }
    const temporaryPassword = generateTemporaryPassword();
    const { salt, hash } = hashPassword(temporaryPassword);
    target.salt = salt;
    target.passwordHash = hash;
    target.mustChangePassword = true;
    target.failedLoginCount = 0;
    target.lockedUntil = null;
    target.updatedAt = new Date().toISOString();
    detachSessionsForUser(store, target.id);
    addLog(store, {
      level: 'security',
      category: 'admin',
      message: `Contraseña restablecida para ${target.email}. Sesiones invalidadas.`,
      actorId: actor.id,
      actorName: actor.name,
      target: target.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'user.reset_password',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      result: 'success',
      details: 'Se generó una contraseña temporal y se invalidaron las sesiones.',
    });
    await saveStore();
    res.json({
      success: true,
      data: { user: publicUser(target), temporaryPassword },
      message: 'Contraseña temporal generada. Muéstrala al usuario por un canal seguro.',
    });
  }));

  router.post('/admin/users/:id/force-logout', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    const target = findUserById(store, req.params.id);
    if (!actor) return;
    if (!target) return safeError(res, 404, 'Usuario no encontrado.', 'NOT_FOUND');
    if (!canManageTarget(actor, target)) {
      return safeError(res, 403, 'No puedes gestionar este usuario.', 'FORBIDDEN');
    }
    detachSessionsForUser(store, target.id);
    addLog(store, {
      level: 'security',
      category: 'admin',
      message: `Sesiones cerradas por un administrador: ${target.email}`,
      actorId: actor.id,
      actorName: actor.name,
      target: target.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'user.force_logout',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true });
  }));

  router.get('/admin/moderation', staffOnly, asyncRoute(async (_req, res) => {
    const store = await getStore();
    const comments = store.reviews
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => ({
        id: r.id,
        type: 'comment' as const,
        mediaId: r.mediaId,
        userId: r.userId,
        author: r.author,
        avatar: r.avatar,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        hidden: r.hidden,
        deleted: r.deleted,
        moderatedBy: r.moderatedBy || null,
        moderationReason: r.moderationReason || null,
      }));
    const reviews = store.library
      .filter((e) => e.review.critique || e.hidden)
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((e) => {
        const user = findUserById(store, e.userId);
        return {
          id: e.id,
          type: 'review' as const,
          mediaId: e.mediaId,
          userId: e.userId,
          author: user?.name || 'Usuario eliminado',
          avatar: user?.avatar || '',
          rating: e.review.stars,
          comment: e.review.critique,
          createdAt: e.updatedAt,
          hidden: e.hidden,
          deleted: false,
          moderatedBy: null,
          moderationReason: null,
        };
      });
    res.json({ success: true, data: [...comments, ...reviews] });
  }));

  router.post('/admin/moderation/:id/hide', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const type = sanitizeText(req.body?.type, 20) || 'comment';
    const reason = sanitizeText(req.body?.reason, 300);
    if (type === 'review') {
      const entry = store.library.find((e) => e.id === req.params.id);
      if (!entry) return safeError(res, 404, 'Reseña no encontrada.', 'NOT_FOUND');
      entry.hidden = true;
      entry.updatedAt = new Date().toISOString();
      addAudit(store, {
        actorId: actor.id,
        actorName: actor.name,
        action: 'moderation.hide',
        targetType: 'review',
        targetId: entry.id,
        targetName: entry.mediaId,
        result: 'success',
        details: reason || undefined,
      });
      addLog(store, {
        level: 'info',
        category: 'moderation',
        message: `Reseña ocultada (${entry.mediaId})`,
        actorId: actor.id,
        actorName: actor.name,
        ip: getClientIp(req),
      });
      await saveStore();
      return res.json({ success: true });
    }
    const review = store.reviews.find((r) => r.id === req.params.id);
    if (!review) return safeError(res, 404, 'Comentario no encontrado.', 'NOT_FOUND');
    review.hidden = true;
    review.moderatedBy = actor.id;
    review.moderationReason = reason;
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'moderation.hide',
      targetType: 'comment',
      targetId: review.id,
      targetName: review.mediaId,
      result: 'success',
      details: reason || undefined,
    });
    addLog(store, {
      level: 'info',
      category: 'moderation',
      message: `Comentario ocultado (${review.mediaId})`,
      actorId: actor.id,
      actorName: actor.name,
      ip: getClientIp(req),
    });
    await saveStore();
    res.json({ success: true });
  }));

  router.post('/admin/moderation/:id/unhide', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const type = sanitizeText(req.body?.type, 20) || 'comment';
    if (type === 'review') {
      const entry = store.library.find((e) => e.id === req.params.id);
      if (!entry) return safeError(res, 404, 'Reseña no encontrada.', 'NOT_FOUND');
      entry.hidden = false;
      entry.updatedAt = new Date().toISOString();
      addAudit(store, {
        actorId: actor.id,
        actorName: actor.name,
        action: 'moderation.unhide',
        targetType: 'review',
        targetId: entry.id,
        targetName: entry.mediaId,
        result: 'success',
      });
      await saveStore();
      return res.json({ success: true });
    }
    const review = store.reviews.find((r) => r.id === req.params.id);
    if (!review) return safeError(res, 404, 'Comentario no encontrado.', 'NOT_FOUND');
    review.hidden = false;
    review.moderatedBy = undefined;
    review.moderationReason = undefined;
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'moderation.unhide',
      targetType: 'comment',
      targetId: review.id,
      targetName: review.mediaId,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true });
  }));

  router.delete('/admin/moderation/:id', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const type = sanitizeText(req.query.type, 20) || 'comment';
    const reason = sanitizeText(req.body?.reason, 300);
    if (type === 'review') {
      const entry = store.library.find((e) => e.id === req.params.id);
      if (!entry) return safeError(res, 404, 'Reseña no encontrada.', 'NOT_FOUND');
      entry.review = { ...entry.review, critique: '' };
      entry.hidden = true;
      entry.updatedAt = new Date().toISOString();
      addAudit(store, {
        actorId: actor.id,
        actorName: actor.name,
        action: 'moderation.delete',
        targetType: 'review',
        targetId: entry.id,
        targetName: entry.mediaId,
        result: 'success',
        details: reason || undefined,
      });
      await saveStore();
      return res.json({ success: true });
    }
    const review = store.reviews.find((r) => r.id === req.params.id);
    if (!review) return safeError(res, 404, 'Comentario no encontrado.', 'NOT_FOUND');
    review.deleted = true;
    review.hidden = true;
    review.moderatedBy = actor.id;
    review.moderationReason = reason;
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'moderation.delete',
      targetType: 'comment',
      targetId: review.id,
      targetName: review.mediaId,
      result: 'success',
      details: reason || undefined,
    });
    addLog(store, {
      level: 'info',
      category: 'moderation',
      message: `Comentario eliminado (${review.mediaId})`,
      actorId: actor.id,
      actorName: actor.name,
      ip: getClientIp(req),
    });
    await saveStore();
    res.json({ success: true });
  }));

  router.get('/admin/settings', staffOnly, asyncRoute(async (_req, res) => {
    const store = await getStore();
    res.json({ success: true, data: store.settings });
  }));

  router.put('/admin/settings', staffOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const body = req.body || {};
    const settings = store.settings;
    if (typeof body.portalName === 'string') settings.portalName = sanitizeText(body.portalName, 80) || settings.portalName;
    if (typeof body.tagline === 'string') settings.tagline = sanitizeText(body.tagline, 160);
    if (typeof body.logoUrl === 'string') settings.logoUrl = sanitizeText(body.logoUrl, 300);
    if (typeof body.communityCommentsEnabled === 'boolean') settings.communityCommentsEnabled = body.communityCommentsEnabled;
    if (typeof body.allowPublicRegistration === 'boolean') settings.allowPublicRegistration = body.allowPublicRegistration;
    if (body.catalogPerPage !== undefined) {
      settings.catalogPerPage = Math.max(8, Math.min(100, Number(body.catalogPerPage) || 24));
    }
    settings.updatedAt = new Date().toISOString();
    settings.updatedBy = actor.id;
    addLog(store, {
      level: 'info',
      category: 'admin',
      message: `Configuración general actualizada por ${actor.email}`,
      actorId: actor.id,
      actorName: actor.name,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'settings.update',
      targetType: 'settings',
      targetName: 'Configuración general',
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: settings });
  }));

  router.get('/admin/history', staffOnly, asyncRoute(async (_req, res) => {
    const store = await getStore();
    const items = store.audit.filter(
      (a) => a.action.startsWith('moderation.') || a.action.startsWith('user.'),
    );
    res.json({ success: true, data: items.slice(0, 500) });
  }));

  router.get('/owner/billing', ownerOnly, asyncRoute(async (_req, res) => {
    const store = await getStore();
    const stripeSecret = await decryptSecret(store.secrets.stripeSecretKey || '');
    res.json({
      success: true,
      data: {
        ...store.billing,
        stripePublishableKey: maskSecret(store.billing.stripePublishableKey),
        stripeConfigured: Boolean(stripeSecret),
        webhookConfigured: Boolean(await decryptSecret(store.secrets.stripeWebhookSecret || '')),
      },
    });
  }));

  router.put('/owner/billing', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const body = req.body || {};
    if (typeof body.planName === 'string') store.billing.planName = sanitizeText(body.planName, 80);
    if (typeof body.planStatus === 'string') store.billing.planStatus = sanitizeText(body.planStatus, 80);
    if (typeof body.stripePublishableKey === 'string') {
      store.billing.stripePublishableKey = sanitizeText(body.stripePublishableKey, 200);
    }
    store.billing.updatedAt = new Date().toISOString();
    addLog(store, {
      level: 'info',
      category: 'billing',
      message: `Configuración de facturación actualizada por ${actor.email}`,
      actorId: actor.id,
      actorName: actor.name,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'billing.update',
      targetType: 'billing',
      targetName: 'Facturación',
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: store.billing });
  }));

  const credentialFields = [
    'stripeSecretKey',
    'stripeWebhookSecret',
    'smtpHost',
    'smtpPort',
    'smtpUser',
    'smtpPassword',
    'emailFrom',
  ] as const;

  router.get('/owner/credentials', ownerOnly, asyncRoute(async (_req, res) => {
    const store = await getStore();
    const result: Record<string, { configured: boolean; masked: string }> = {};
    for (const field of credentialFields) {
      const value = await decryptSecret(store.secrets[field] || '');
      result[field] = { configured: Boolean(value), masked: value ? maskSecret(value) : '' };
    }
    res.json({ success: true, data: result });
  }));

  router.put('/owner/credentials', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const body = req.body || {};
    for (const field of credentialFields) {
      if (!(field in body)) continue;
      const raw = typeof body[field] === 'string' ? body[field].trim() : '';
      if (raw === '') {
        delete store.secrets[field];
      } else {
        store.secrets[field] = await encryptSecret(raw);
      }
    }
    addLog(store, {
      level: 'security',
      category: 'security',
      message: `Credenciales de API actualizadas por ${actor.email}`,
      actorId: actor.id,
      actorName: actor.name,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'credentials.update',
      targetType: 'credentials',
      targetName: 'Credenciales de API',
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, message: 'Credenciales guardadas de forma cifrada.' });
  }));

  router.post('/owner/credentials/test', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const provider = sanitizeText(req.body?.provider, 20);
    if (provider === 'stripe') {
      const secret = await decryptSecret(store.secrets.stripeSecretKey || '');
      if (!secret) return safeError(res, 400, 'Stripe no está configurado.', 'NOT_CONFIGURED');
      const valid = /^sk_(live|test)_[A-Za-z0-9]{10,}$/.test(secret);
      return res.json({
        success: true,
        data: { ok: valid, message: valid ? 'Clave de Stripe con formato válido.' : 'La clave de Stripe no tiene un formato válido.' },
      });
    }
    if (provider === 'smtp') {
      const host = await decryptSecret(store.secrets.smtpHost || '');
      const user = await decryptSecret(store.secrets.smtpUser || '');
      const password = await decryptSecret(store.secrets.smtpPassword || '');
      if (!host || !user || !password) {
        return safeError(res, 400, 'La configuración SMTP está incompleta.', 'NOT_CONFIGURED');
      }
      try {
        await dns.lookup(host);
        return res.json({ success: true, data: { ok: true, message: `Host SMTP resuelto correctamente (${host}).` } });
      } catch {
        return res.json({ success: true, data: { ok: false, message: 'No se pudo resolver el host SMTP.' } });
      }
    }
    return safeError(res, 400, 'Proveedor no soportado.', 'INVALID_PROVIDER');
  }));

  router.get('/owner/logs', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const category = sanitizeText(req.query.category, 30);
    const level = sanitizeText(req.query.level, 20);
    const items = store.logs
      .filter((l) => (!category || l.category === category) && (!level || l.level === level))
      .slice(0, 500);
    res.json({ success: true, data: items });
  }));

  router.get('/owner/admins', ownerOnly, asyncRoute(async (_req, res) => {
    const store = await getStore();
    const admins = store.users
      .filter((u) => u.role === 'admin')
      .map((u) => ({ ...publicUser(u), sessionsCount: store.sessions.filter((s) => s.userId === u.id).length }));
    res.json({ success: true, data: admins });
  }));

  router.post('/owner/admins', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const mode = sanitizeText(req.body?.mode, 20) || 'promote';
    if (mode === 'create') {
      const name = sanitizeText(req.body?.name, 80);
      const email = sanitizeText(req.body?.email, 160).toLowerCase();
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!name) return safeError(res, 400, 'Indica el nombre del administrador.', 'INVALID_NAME');
      if (!validateEmail(email)) return safeError(res, 400, 'El correo no es válido.', 'INVALID_EMAIL');
      const passwordError = validatePassword(password);
      if (passwordError) return safeError(res, 400, passwordError, 'INVALID_PASSWORD');
      if (findUserByEmail(store, email)) {
        return safeError(res, 409, 'Ya existe una cuenta con este correo.', 'EMAIL_IN_USE');
      }
      const user = createUserRecord({ name, email, password, role: 'admin' });
      store.users.push(user);
      addLog(store, {
        level: 'security',
        category: 'admin',
        message: `Cuenta de administrador creada: ${email}`,
        actorId: actor.id,
        actorName: actor.name,
        target: email,
        ip: getClientIp(req),
      });
      addAudit(store, {
        actorId: actor.id,
        actorName: actor.name,
        action: 'admin.create',
        targetType: 'user',
        targetId: user.id,
        targetName: user.name,
        result: 'success',
      });
      await saveStore();
      return res.json({ success: true, data: publicUser(user) });
    }
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const user = findUserByEmail(store, email);
    if (!user) return safeError(res, 404, 'Usuario no encontrado.', 'NOT_FOUND');
    if (user.role === 'owner') return safeError(res, 400, 'El propietario no puede ser promovido.', 'INVALID_TARGET');
    user.role = 'admin';
    user.updatedAt = new Date().toISOString();
    addLog(store, {
      level: 'security',
      category: 'admin',
      message: `Usuario promovido a administrador: ${user.email}`,
      actorId: actor.id,
      actorName: actor.name,
      target: user.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'admin.promote',
      targetType: 'user',
      targetId: user.id,
      targetName: user.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: publicUser(user) });
  }));

  router.delete('/owner/admins/:id', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const target = findUserById(store, req.params.id);
    if (!target) return safeError(res, 404, 'Usuario no encontrado.', 'NOT_FOUND');
    if (target.role !== 'admin') {
      return safeError(res, 400, 'El usuario no es administrador.', 'INVALID_TARGET');
    }
    target.role = 'user';
    target.updatedAt = new Date().toISOString();
    addLog(store, {
      level: 'security',
      category: 'admin',
      message: `Rol de administrador revocado: ${target.email}`,
      actorId: actor.id,
      actorName: actor.name,
      target: target.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'admin.revoke',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: publicUser(target) });
  }));

  router.post('/owner/transfer-ownership', ownerOnly, asyncRoute(async (req, res) => {
    const store = await getStore();
    const actor = req.authUser;
    if (!actor) return;
    const targetId = sanitizeText(req.body?.targetUserId, 80);
    const email = sanitizeText(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const confirmation = sanitizeText(req.body?.confirmation, 60);
    const doubleConfirm = Boolean(req.body?.doubleConfirm);
    const target = targetId ? findUserById(store, targetId) : findUserByEmail(store, email);
    if (!target) return safeError(res, 404, 'Usuario destino no encontrado.', 'NOT_FOUND');
    if (target.id === actor.id) {
      return safeError(res, 400, 'No puedes transferir la propiedad a ti mismo.', 'INVALID_TARGET');
    }
    if (target.blocked) return safeError(res, 400, 'El usuario destino está bloqueado.', 'INVALID_TARGET');
    if (!verifyPassword(password, actor.salt, actor.passwordHash)) {
      addLog(store, {
        level: 'security',
        category: 'security',
        message: `Intento fallido de transferencia de propiedad por ${actor.email}`,
        actorId: actor.id,
        actorName: actor.name,
        ip: getClientIp(req),
      });
      await saveStore();
      return safeError(res, 401, 'La contraseña actual no es correcta.', 'INVALID_PASSWORD');
    }
    if (confirmation !== 'TRANSFERIR PROPIEDAD' || !doubleConfirm) {
      return safeError(res, 400, 'Debes confirmar la transferencia por doble vía.', 'CONFIRMATION_REQUIRED');
    }
    target.role = 'owner';
    target.updatedAt = new Date().toISOString();
    actor.role = 'admin';
    actor.updatedAt = new Date().toISOString();
    addLog(store, {
      level: 'security',
      category: 'admin',
      message: `Propiedad transferida de ${actor.email} a ${target.email}`,
      actorId: actor.id,
      actorName: actor.name,
      target: target.email,
      ip: getClientIp(req),
    });
    addAudit(store, {
      actorId: actor.id,
      actorName: actor.name,
      action: 'ownership.transfer',
      targetType: 'user',
      targetId: target.id,
      targetName: target.name,
      result: 'success',
    });
    await saveStore();
    res.json({ success: true, data: { user: publicUser(actor), newOwner: publicUser(target) } });
  }));

  return router;
}

export function requireSessionUser(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).authUser;
  if (!user) {
    safeError(res, 401, 'Debes iniciar sesión para continuar.', 'UNAUTHENTICATED');
    return;
  }
  next();
}

export function requireCatalogEditor(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthedRequest).authUser;
  if (!user) {
    safeError(res, 401, 'Debes iniciar sesión para continuar.', 'UNAUTHENTICATED');
    return;
  }
  if (user.role !== 'owner' && user.role !== 'admin') {
    safeError(res, 403, 'No tienes permisos para editar el catálogo.', 'FORBIDDEN');
    return;
  }
  next();
}
