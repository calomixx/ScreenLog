/**
 * Prueba real de las reglas de Firestore con el mismo tipo de sesión que usa
 * la app (custom token firmado por el servidor).
 *
 * Crea `users/{uid}` y `users/{uid}/movie_classifications/...`, los lee, los
 * borra y confirma que no se puede escribir en la cuenta de otro usuario.
 *
 * Uso: npm run firebase:verify
 */
import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const config = JSON.parse(readFileSync('firebase-applet-config.json', 'utf8'));
const serviceAccount = JSON.parse(readFileSync('serviceAccountKey.json', 'utf8'));
const projectId = process.env.FIREBASE_PROJECT_ID || config.projectId;
// Permite probar la base que usa la app desplegada sin editar la configuración.
const databaseId = process.env.FIRESTORE_DATABASE_ID || config.firestoreDatabaseId || '(default)';
const apiKey = config.apiKey;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents`;

initializeApp({ credential: cert(serviceAccount), projectId });

const uid = `diag-${Date.now()}`;
const mediaId = 'diag-media-1';
const otherUid = `diag-otro-${Date.now()}`;

const s = (value) => ({ stringValue: String(value) });
const b = (value) => ({ booleanValue: Boolean(value) });
const n = (value) => ({ doubleValue: Number(value) });
const i = (value) => ({ integerValue: String(value) });
const arr = (values) => ({ arrayValue: { values: values.map(s) } });
const map = (fields) => ({ mapValue: { fields } });

const docName = (path) => `projects/${projectId}/databases/${databaseId}/documents/${path}`;

async function commit(idToken, writes) {
  const res = await fetch(`${base}:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

async function readDoc(idToken, path) {
  const res = await fetch(`${base}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

function writeDoc(path, fields, { create = false, withTimestamps = true } = {}) {
  const write = {
    update: { name: docName(path), fields },
  };
  if (withTimestamps) {
    write.updateTransforms = [
      { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
      { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
    ];
  }
  if (create) write.currentDocument = { exists: false };
  return write;
}

/** users_public solo permite `updatedAt`, no `createdAt`. */
function writePublicProfile(path, fields) {
  return {
    update: { name: docName(path), fields },
    updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
    currentDocument: { exists: false },
  };
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '[OK]  ' : '[FALLA]'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const customToken = await getAuth().createCustomToken(uid, {
    email: `${uid}@screeamlog.local`,
  });

  const signIn = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const session = await signIn.json();
  if (!signIn.ok || !session.idToken) {
    throw new Error(`No se pudo iniciar sesión con el custom token: ${JSON.stringify(session)}`);
  }
  check(
    'El navegador puede canjear el custom token',
    true,
    `uid ${session.localId || session.userId || '(creada)'}`,
  );
  const idToken = session.idToken;

  const account = await commit(idToken, [
    writeDoc(
      `users/${uid}`,
      {
        uid: s(uid),
        displayName: s('Diagnóstico'),
        email: s(`${uid}@screeamlog.local`),
        photoURL: s(''),
        preferences: map({}),
        createdAt: { nullValue: null },
        updatedAt: { nullValue: null },
      },
      { create: true },
    ),
  ]);
  check('Crear users/{uid}', account.ok, account.ok ? '' : JSON.stringify(account.body).slice(0, 400));

  const classification = await commit(idToken, [
    writeDoc(
      `users/${uid}/movie_classifications/${mediaId}`,
      {
        movieId: s(mediaId),
        uid: s(uid),
        status: s('watched'),
        isFavorite: b(true),
        rating: n(5),
        categories: arr(['ciencia-ficcion']),
        tags: arr(['diag']),
        notes: s('prueba automática'),
        evaluation: s(''),
        watchedDate: s('2026-11-26'),
        platform: s('Cine'),
        wouldRewatch: s('yes'),
        favoriteMoment: s(''),
        shortVerdict: s(''),
        quote: s(''),
        recommendation: s('yes'),
        moodRecommendation: s(''),
        favoriteCharacter: s(''),
        scriptRating: n(8),
        actingRating: n(8),
        directionRating: n(8),
        soundtrackRating: n(8),
        cinematographyRating: n(8),
        pacingRating: n(8),
        emotionalImpact: n(8),
        schemaVersion: i(1),
        createdAt: { nullValue: null },
        updatedAt: { nullValue: null },
      },
      { create: true },
    ),
  ]);
  check(
    'Crear users/{uid}/movie_classifications/{mediaId}',
    classification.ok,
    classification.ok ? '' : JSON.stringify(classification.body).slice(0, 400),
  );

  const readBack = await readDoc(idToken, `users/${uid}/movie_classifications/${mediaId}`);
  const readRating = readBack.body?.fields?.rating?.doubleValue;
  check('Leer la clasificación como dueño', readBack.ok && readRating === 5, `rating=${readRating}`);

  // Perfil público: lo necesitan el catálogo y las reseñas comunitarias.
  const publicProfile = await commit(idToken, [
    writePublicProfile(`users_public/${uid}`, {
      userId: s(uid),
      name: s('Diagnóstico'),
      username: s(`diag_${Date.now()}`),
      avatar: s(''),
      updatedAt: { nullValue: null },
    }),
  ]);
  check(
    'Crear users_public sin email verificado',
    publicProfile.ok,
    publicProfile.ok ? '' : JSON.stringify(publicProfile.body).slice(0, 400),
  );

  const catalog = await commit(idToken, [
    writeDoc(
      `catalog_media/${mediaId}`,
      {
        authorId: s(uid),
        title: s('Película de diagnóstico'),
        type: s('pelicula'),
        year: i(2026),
        director: s('Diagnóstico'),
        synopsis: s('Prueba de escritura del catálogo.'),
        posterUrl: s(''),
        backdropUrl: s(''),
        duration: s('2h 00m'),
        defaultPlatform: s('Cine'),
        genres: arr(['Drama']),
        createdAt: { nullValue: null },
        updatedAt: { nullValue: null },
      },
      { create: true },
    ),
  ]);
  check(
    'Crear catalog_media sin email verificado',
    catalog.ok,
    catalog.ok ? '' : JSON.stringify(catalog.body).slice(0, 400),
  );

  const review = await commit(idToken, [
    writeDoc(
      `community_reviews/${mediaId}_review`,
      {
        userId: s(uid),
        mediaId: s(mediaId),
        author: s('Diagnóstico'),
        avatar: s(''),
        rating: n(5),
        comment: s('Reseña de diagnóstico.'),
        likes: i(0),
        createdAt: { nullValue: null },
        updatedAt: { nullValue: null },
      },
      { create: true },
    ),
  ]);
  check(
    'Crear community_reviews sin email verificado',
    review.ok,
    review.ok ? '' : JSON.stringify(review.body).slice(0, 400),
  );

  const foreign = await commit(idToken, [
    writeDoc(`users/${otherUid}`, {
      uid: s(otherUid),
      displayName: s('Ajeno'),
      email: s('ajeno@screeamlog.local'),
      preferences: map({}),
      createdAt: { nullValue: null },
      updatedAt: { nullValue: null },
    }),
  ]);
  check(
    'Bloquear escritura en la cuenta de otro usuario',
    !foreign.ok && foreign.status === 403,
    `HTTP ${foreign.status}`,
  );

  const deleteClassification = await commit(idToken, [
    { delete: docName(`users/${uid}/movie_classifications/${mediaId}`) },
  ]);
  const deleteAccount = await commit(idToken, [{ delete: docName(`users/${uid}`) }]);
  const deleteExtras = await commit(idToken, [
    { delete: docName(`catalog_media/${mediaId}`) },
    { delete: docName(`community_reviews/${mediaId}_review`) },
    { delete: docName(`users_public/${uid}`) },
  ]);
  check(
    'Borrar los documentos de prueba',
    deleteClassification.ok && deleteAccount.ok && deleteExtras.ok,
    `HTTP ${deleteClassification.status}/${deleteAccount.status}/${deleteExtras.status}`,
  );

  const failed = results.filter((result) => !result.ok);
  console.log(
    failed.length === 0
      ? '\n[OK] Todo el modelo funciona contra Firestore real.'
      : `\n[FALLA] ${failed.length} comprobación(es) fallaron.`,
  );
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error('\n[ERROR]', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
