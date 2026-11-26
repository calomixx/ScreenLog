/**
 * Pasa el catálogo del servidor (y de la base anterior) a la base de Firestore
 * que usa la app, sin dejar títulos solo en localStorage o en el JSON efímero.
 *
 * Uso: npm run firebase:sync-catalog
 * Opciones: FIRESTORE_DATABASE_ID, SERVER_URL
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const config = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const serviceAccount = JSON.parse(readFileSync('serviceAccountKey.json', 'utf8'));
const projectId = process.env.FIREBASE_PROJECT_ID || config.projectId;
const databaseId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId || '(default)';
const serverUrl = process.env.SERVER_URL || 'https://screenlogproc.ai.studio';

const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(serviceAccount), projectId });
const db = getFirestore(app, databaseId);

const str = (value, max, fallback = '') => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, max) : fallback;
};
const int = (value, fallback = 0) => {
  const n = Math.round(Number(value) || 0);
  return Number.isFinite(n) ? n : fallback;
};
const num = (value) => {
  const n = Number(value) || 0;
  return Number.isFinite(n) ? n : 0;
};
const list = (value, max) =>
  Array.isArray(value)
    ? value.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim().slice(0, 80)).slice(0, max)
    : [];

/** Solo campos permitidos por isValidCatalogMediaItem en firestore.rules. */
function toCatalogDoc(item, existingCreatedAt) {
  const authorId = str(item.createdByUserId || item.authorId || item.lastEditedBy, 128, 'admin_initial_sync');
  const genres = list(item.genres, 10);
  const doc = {
    authorId,
    title: str(item.title, 200, 'Sin título'),
    type: ['pelicula', 'serie', 'anime', 'documental', 'novela'].includes(item.type) ? item.type : 'pelicula',
    year: Math.min(2100, Math.max(1888, int(item.year, new Date().getFullYear()))),
    director: str(item.director, 120, 'Desconocido'),
    synopsis: str(item.synopsis, 2000, 'Sin sinopsis disponible.'),
    posterUrl: str(item.posterUrl, 1000),
    backdropUrl: str(item.backdropUrl || item.posterUrl, 1000),
    duration: str(item.duration, 60, '2h 00m'),
    defaultPlatform: str(item.defaultPlatform || item.streamingPlatforms?.[0], 80, 'Cine / Sala'),
    genres: genres.length ? genres : ['Drama'],
    createdAt: existingCreatedAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  const optionalStrings = [
    'originalTitle', 'trailerYoutubeId', 'trailerUrl', 'releaseDate', 'country', 'language',
    'ageRating', 'status', 'lastEditedAt', 'lastEditedBy', 'createdByUserId',
  ];
  for (const key of optionalStrings) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') doc[key] = str(item[key], 200);
  }
  for (const key of ['cast', 'streamingPlatforms', 'tags']) {
    const values = list(item[key], key === 'tags' ? 12 : 10);
    if (values.length) doc[key] = values;
  }
  if (item.seasonsCount !== undefined) doc.seasonsCount = Math.min(200, Math.max(0, int(item.seasonsCount)));
  if (item.episodesCount !== undefined) doc.episodesCount = Math.min(10000, Math.max(0, int(item.episodesCount)));
  if (item.communityRating !== undefined) doc.communityRating = Math.min(10, Math.max(0, num(item.communityRating)));
  for (const key of ['communityVotesCount', 'addedToListCount']) {
    if (item[key] !== undefined) doc[key] = Math.min(1000000, Math.max(0, int(item[key])));
  }
  for (const key of ['isFeatured', 'isTrending', 'isTopClassified', 'isCustomUserCreated']) {
    if (item[key] !== undefined) doc[key] = Boolean(item[key]);
  }
  return doc;
}

const sources = new Map();

// 1. Catálogo que ya estaba en la base anterior (default).
try {
  const oldDb = getFirestore(app, '(default)');
  const snap = await oldDb.collection('catalog_media').get();
  for (const doc of snap.docs) sources.set(doc.id, doc.data());
  console.log(`Catálogo en (default): ${snap.size}`);
} catch (error) {
  console.warn(`No se pudo leer (default): ${error.message}`);
}

// 2. Catálogo que tiene actualmente el servidor de la app.
try {
  const response = await fetch(`${serverUrl}/api/media`);
  const json = await response.json();
  for (const item of json.data || []) {
    if (item?.id && !sources.has(item.id)) sources.set(item.id, item);
  }
  console.log(`Catálogo en el servidor: ${(json.data || []).length}`);
} catch (error) {
  console.warn(`No se pudo leer el servidor: ${error.message}`);
}

// 3. Películas que están en la biblioteca de un usuario pero no en el catálogo:
//    se rescata un stub para que la ficha no quede huérfana.
try {
  const classified = await db.collectionGroup('movie_classifications').get();
  for (const doc of classified.docs) {
    const data = doc.data();
    const id = String(data.movieId || doc.id || '');
    if (!id || sources.has(id)) continue;
    const slug = id.replace(/^custom-\d+-/, '').replace(/[-_]+/g, ' ').trim();
    const title = slug ? slug.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Película de mi lista';
    sources.set(id, {
      id,
      title,
      type: 'pelicula',
      year: new Date().getFullYear(),
      director: 'Desconocido',
      synopsis: 'Añadida desde tu biblioteca.',
      genres: ['Drama'],
      createdByUserId: String(data.uid || 'admin_initial_sync'),
      isCustomUserCreated: true,
    });
  }
  console.log(`Clasificaciones revisadas: ${classified.size}`);
} catch (error) {
  console.warn(`No se pudieron revisar las clasificaciones: ${error.message}`);
}

const batch = db.batch();
let created = 0;
let updated = 0;
for (const [id, item] of sources) {
  const ref = db.collection('catalog_media').doc(id);
  const snap = await ref.get();
  const payload = toCatalogDoc(item, snap.exists ? snap.data().createdAt : null);
  batch.set(ref, payload, { merge: true });
  if (snap.exists) updated += 1;
  else created += 1;
}
await batch.commit();

const finalCount = (await db.collection('catalog_media').count().get()).data().count;
console.log(`[OK] ${databaseId}: ${created} creados, ${updated} actualizados, total ${finalCount}.`);
