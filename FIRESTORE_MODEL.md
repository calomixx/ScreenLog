# Modelo de datos Firestore — Usuarios y clasificación personal

> Documento de diseño del modelo NoSQL que persiste **cuentas**, **preferencias** y la
> **clasificación personal de cada película** (estado, nota, favoritos, categorías,
> etiquetas, notas y métricas detalladas).
>
> Implementación: `src/lib/firestore/` · Reglas: `firestore.rules` · Índices:
> `firestore.indexes.json` · Despliegue: `firebase.json`.

---

## 1. Análisis del esquema actual (punto de partida)

Antes de este cambio, la app tenía tres fuentes de verdad parciales y solapadas:

| Origen | Qué guardaba | Problema |
| --- | --- | --- |
| `server/store.ts` + `data/store.json` (`/api/me/library`) | Biblioteca por usuario en JSON local | No es tiempo real ni multiusuario real; es la copia "de servidor". |
| `user_library/{uid_mediaId}` | Estado, nota, rewatch, comentario | Modelo plano y **duplicado**: un doc por par usuario/película con ID compuesto; no admite categorías, etiquetas ni métricas por aspecto. |
| `localStorage` / estado en memoria (`MediaContext`) | Caché optimista de la UI | Se pierde al cambiar de dispositivo; no es fuente de verdad. |
| `catalog_media/{mediaId}` | Catálogo compartido (22 fichas enriquecidas) | Correcto: es el catálogo, no la clasificación del usuario. |
| `users_public/{uid}` | Perfil público sin PII | Correcto, pero no existía una entidad de cuenta privada ni preferencias. |

Consecuencias detectadas:

- **Duplicación de identidad**: el par `(uid, mediaId)` se codificaba en el ID
  (`uid_mediaId`), lo que impide consultar por estado o nota sin filtrar por prefijo.
- **Huérfanos lógicos**: nada impedía que existieran entradas para películas que ya no
  están en el catálogo, ni clasificaciones sin cuenta.
- **Inconsistencias**: la UI usa estados en español (`pendiente`, `en_proceso`,
  `terminada`) y rewatch con cuatro valores; Firestore no tenía un contrato estable.
- **Sin datos ricos**: categorías, tags, momento favorito, notas por aspecto
  (guión, actuación, dirección…) solo vivían en memoria.

---

## 2. Propuesta de colecciones

```
catalog_media/{mediaId}                        ← catálogo compartido (ya existente)
users_public/{uid}                             ← perfil público sin PII (ya existente)
users/{uid}                                    ← cuenta privada + preferencias
users/{uid}/private/info                       ← PII aislada (email) (ya existente)
users/{uid}/movie_classifications/{mediaId}    ← clasificación personal (1 doc por película)
users/{uid}/lists/{listId}                     ← listas personalizadas
users/{uid}/lists/{listId}/items/{mediaId}     ← elementos ordenados de una lista
user_library/{uid_mediaId}                     ← legado: solo lectura + borrado tras migrar
community_reviews/{reviewId}                   ← reseñas públicas (ya existente)
```

### 2.1 `users/{uid}` — cuenta privada

Un documento por UID de Firebase Auth. Contiene datos de cuenta y preferencias que
**no** deben ser públicos.

```json
{
  "uid": "u_8f3Kd9",
  "displayName": "Marta",
  "email": "marta@example.com",
  "photoURL": "https://…/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "es",
    "favoriteGenres": ["Ciencia ficción", "Cine negro"],
    "defaultStatus": "pending"
  },
  "legacyLibraryMigratedAt": "2026-11-25T10:12:44Z",
  "createdAt": "2026-01-03T18:20:00Z",
  "updatedAt": "2026-11-25T10:12:44Z"
}
```

- `legacyLibraryMigratedAt` es un **marcador idempotente**: si existe, no se vuelve a
  migrar `user_library` ni la copia del servidor.
- `preferences` se escribe con `merge` para no pisar el resto del documento.
- El email se duplica aquí por comodidad del propietario; la copia "aislada" sigue en
  `users/{uid}/private/info` (regla histórica del proyecto).

### 2.2 `users/{uid}/movie_classifications/{mediaId}` — clasificación personal

**El ID del documento es el `mediaId` del catálogo.** Eso garantiza, por construcción:

- **Cero duplicados** por usuario y película (no puede haber dos docs con el mismo ID).
- Lectura directa O(1): `getDoc(users/{uid}/movie_classifications/{mediaId})`.
- Borrado inequívoco al quitar de la lista.

```json
{
  "movieId": "interstellar-2014",
  "uid": "u_8f3Kd9",
  "status": "watched",
  "isFavorite": true,
  "rating": 4.5,
  "categories": ["Favorita", "Cine de autor"],
  "tags": ["visualmente hipnótica", "banda sonora"],
  "notes": "La escena del agua me dejó sin aire.",
  "evaluation": "Obra Maestra (10/10)",
  "watchedDate": "2026-11-20",
  "platform": "Prime Video",
  "wouldRewatch": "yes",
  "favoriteMoment": "El acoplamiento.",
  "shortVerdict": "Ciencia ficción emocional.",
  "quote": "No podemos resolverlo con la gravedad.",
  "recommendation": "yes",
  "moodRecommendation": "Noche tranquila, con auriculares.",
  "favoriteCharacter": "Cooper",
  "scriptRating": 9,
  "actingRating": 9,
  "directionRating": 10,
  "soundtrackRating": 10,
  "cinematographyRating": 10,
  "pacingRating": 8,
  "emotionalImpact": 10,
  "schemaVersion": 1,
  "createdAt": "2026-11-20T22:01:00Z",
  "updatedAt": "2026-11-25T09:40:12Z"
}
```

### 2.3 `users/{uid}/lists/{listId}` y `items/{mediaId}`

Listas curadas por el usuario. El orden se guarda como `position` (entero) en el
elemento, no como array de IDs, para permitir reordenar sin reescribir la lista entera.

```json
// users/{uid}/lists/{listId}
{ "listId": "l_ciencia_ficcion", "uid": "u_8f3Kd9", "name": "Sci-fi para repetir",
  "description": "Clásicos y modernos", "isPublic": false,
  "createdAt": "…", "updatedAt": "…" }

// users/{uid}/lists/{listId}/items/{mediaId}
{ "movieId": "interstellar-2014", "position": 0, "addedAt": "…" }
```

---

## 3. Justificación del diseño NoSQL

El modelo se deriva de las **consultas reales**, no de un esquema relacional:

| Consulta de la app | Estructura que la resuelve |
| --- | --- |
| "Mi lista" completa, en tiempo real | `onSnapshot` sobre la subcolección del usuario. |
| Filtrar por estado | `where('status','==',…) + orderBy('updatedAt','desc')` → índice compuesto. |
| Favoritas | `where('isFavorite','==',true) + orderBy('updatedAt')` → índice. |
| Por categoría o etiqueta | `array-contains` sobre `categories` / `tags` → índice. |
| "Mejores notas" | `where('rating','>=',4)` → índice. |
| Detalle de una película | `getDoc` por ID = `mediaId`. |

Decisiones clave:

1. **Subcolección por usuario, no colección global con `where('uid','==',…)`.**
   - Aísla los datos por propietario (reglas más simples y seguras).
   - Evita índices globales que crecen con todos los usuarios.
   - Permite borrar la cuenta completa con una operación recursiva.
2. **ID de documento = `mediaId`.** Evita duplicados sin transacciones ni claves
   compuestas. El `uid` va dentro del doc solo para validación/defensa.
3. **No se duplica la película.** La clasificación guarda solo `movieId`; el título,
   póster, año y géneros se resuelven contra `catalog_media`/catálogo en memoria. Así
   una corrección del catálogo se refleja en todas las listas sin migración.
   > Única concesión: `classificationToUserReview` rellena `year`/`genres`/`director`
   > desde el catálogo en memoria para que la UI pinte sin esperar otra consulta; no se
   > persisten.
4. **Categorías y etiquetas como arrays de strings.** Firestore no tiene tablas de
   unión; `array-contains` cubre el filtrado y el límite se valida en reglas.
5. **Enums estables en inglés** (`pending`, `watching`, `watched`, `discarded`).
   La UI traduce a `pendiente`/`en_proceso`/`terminada` en una capa de mapeo
   (`schema.ts`), evitando mezclar idioma de presentación con datos.
6. **`schemaVersion`** permite evolucionar el documento sin romper lecturas antiguas.
7. **Listas como subcolección con `position`** en lugar de un array dentro del doc:
   evita el límite de 1 MiB y las escrituras conflictivas al reordenar.

### Alternativas descartadas

- **Un solo doc `users/{uid}` con un mapa `classifications: {mediaId: {...}}`.**
  Simple, pero el documento crece sin límite (1 MiB), no se puede paginar y cada
  guardado reescribe todo. Descartado.
- **Colección global `classifications` con `uid`.** Requiere índices compuestos
  globales y reglas basadas en `resource.data.uid` para cada consulta; más caro y más
  fácil de filtrar mal. Descartado.
- **Duplicar el documento completo de la película.** Rompe la fuente única de verdad
  del catálogo y multiplica el almacenamiento. Descartado.

---

## 4. Tipos TypeScript

Definidos en `src/lib/firestore/schema.ts`:

```ts
export type MovieStatus = 'pending' | 'watching' | 'watched' | 'discarded';
export type RewatchIntent = 'yes' | 'maybe' | 'no' | 'unset';
export type RecommendationIntent = 'yes' | 'maybe' | 'no' | '';

export interface MovieClassification {
  movieId: string;
  uid: string;
  status: MovieStatus;
  isFavorite: boolean;
  rating: number;          // 0 = sin nota · 0.5–5
  categories: string[];    // máx. 10 × 40 chars
  tags: string[];          // máx. 12 × 40 chars
  notes: string;           // máx. 2000
  evaluation: string;
  watchedDate: string;     // YYYY-MM-DD
  platform: string;
  wouldRewatch: RewatchIntent;
  favoriteMoment: string;
  shortVerdict: string;
  quote: string;
  recommendation: RecommendationIntent;
  moodRecommendation: string;
  favoriteCharacter: string;
  scriptRating: number;    // 0–10
  actingRating: number;
  directionRating: number;
  soundtrackRating: number;
  cinematographyRating: number;
  pacingRating: number;
  emotionalImpact: number;
  schemaVersion: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Campos que acepta la API de escritura (sin uid ni timestamps). */
export type MovieClassificationInput = Partial<
  Omit<MovieClassification, 'movieId' | 'uid' | 'createdAt' | 'updatedAt' | 'schemaVersion'>
>;
```

La UI sigue hablando `UserReview` (`src/types.ts`); el puente está en
`libraryBridge.ts` y las funciones `classificationToUserReview` /
`userReviewToClassificationInput`.

---

## 5. Servicios de acceso a datos

`src/lib/firestore/`:

### `classifications.ts` — CRUD y consultas

| Función | Uso |
| --- | --- |
| `getClassification(uid, movieId)` | Lectura puntual; `null` si no existe. |
| `upsertClassification(uid, movieId, input)` | Crea o reemplaza. Conserva `createdAt`. |
| `updateClassification(uid, movieId, patch)` | Fusiona un subconjunto de campos. |
| `setClassificationStatus(uid, movieId, status)` | Atajo de estado. |
| `setClassificationRating(uid, movieId, rating)` | Atajo de nota. |
| `toggleClassificationFavorite(uid, movieId)` | Alterna favorito. |
| `deleteClassification(uid, movieId)` | Borra la clasificación. |
| `listClassifications(uid, filters)` | Consulta paginada con `limit`/`startAfter`. |
| `countClassifications(uid, filters)` | Conteo agregado (server-side). |
| `subscribeToClassifications(uid, cb)` | Tiempo real de toda la biblioteca. |
| `subscribeToFavorites(uid, cb)` | Tiempo real de favoritas. |
| `subscribeToStatus(uid, status, cb)` | Tiempo real por estado. |

Todas las funciones:

- Validan que `uid === auth.currentUser.uid` (defensa en cliente; la regla manda).
- Sanean IDs con `sanitizeFirestoreId` y recortan strings con los límites del esquema.
- Envuelven errores en `FirestoreDataError` con `code` y `path` (mensajes en español).
- Escriben `createdAt`/`updatedAt` con `serverTimestamp()`.

### `users.ts` — cuenta y preferencias

`ensureUserAccount`, `getUserAccount`, `updateUserPreferences`,
`markLegacyLibraryMigrated`, `subscribeUserAccount`.

`ensureUserAccount` se llama al iniciar sesión (en `AuthContext`) y es idempotente.

### `src/lib/firebaseCustomToken.ts` — sesión de Firebase automática (recomendada)

El servidor firma un *custom token* para el usuario que ya inició sesión en la app
(`POST /api/auth/firebase-token`) y el navegador lo canjea con
`signInWithCustomToken`. No hace falta el proveedor Email/Password ni que el usuario
escriba nada: al iniciar sesión, `AuthContext` abre la sesión de Firebase sola, y si
algún guardado llega antes, `MediaContext` la abre en ese momento antes de escribir.

El servidor también crea el usuario de Firebase (`uid` = id del usuario de la app) con
el email verificado la primera vez. Si el servidor desplegado no tiene la credencial,
la app usa Email/Password y el usuario queda sin verificar: las reglas ya **no exigen**
`email_verified` para las acciones del dueño, solo una sesión válida de Firebase Auth.

Requisito de una sola vez (servidor, no usuarios finales): una credencial de servicio.

```bash
# Firebase Console → Configuración del proyecto → Cuentas de servicio
# → Generar nueva clave privada → guardar como serviceAccountKey.json en la raíz
npm run firebase:check   # confirma que el servidor puede firmar sesiones
```

También se puede definir `FIREBASE_SERVICE_ACCOUNT_JSON` (JSON en una variable) o
`FIREBASE_SERVICE_ACCOUNT_FILE` (ruta). El archivo está en `.gitignore`.

Si esa credencial no existe, el respaldo es habilitar **Email/Password** en
*Authentication → Sign-in method*: `ensureFirebasePasswordSession` crea la cuenta de
Firebase automáticamente con la contraseña de la app.

### `src/lib/firebaseAuthBridge.ts` — respaldo con Email/Password

La app autentica contra su propio servidor (`/api/auth/login`), no contra Firebase.
Firestore firma cada petición con `request.auth`, así que sin una sesión de Firebase
las reglas rechazan las escrituras. `ensureFirebasePasswordSession(email, password, name)`
crea o reutiliza esa identidad (best-effort, nunca bloquea el login de la app) y se
invoca desde `login`, `register` y `setupOwner` en `AuthContext`.

### `lists.ts` — listas personalizadas

`createCustomList`, `updateCustomList`, `deleteCustomList` (borra también sus items en
lote), `addMovieToCustomList`, `removeMovieFromCustomList`, `subscribeToCustomLists`,
`subscribeToCustomListItems`.

### `libraryBridge.ts` — compatibilidad con la UI

Mantiene las firmas que ya consumía `MediaContext`:

```ts
saveLibraryEntryToFirestore(review: UserReview): Promise<void>
removeLibraryEntryFromFirestore(mediaId: string): Promise<void>
subscribeToUserLibrary(uid, onEntries, mediaLookup?): () => void
```

### `migration.ts` — migración

`migrateReviewsToFirestore`, `migrateLegacyLibraryForUser`,
`migrateAllLegacyLibraries`, `maybeMigrateServerLibrary`.

---

## 6. Índices compuestos (`firestore.indexes.json`)

| Colección | Campos | Consulta que habilita |
| --- | --- | --- |
| `movie_classifications` | `status ASC`, `updatedAt DESC` | Filtrar por estado ordenado por actividad. |
| `movie_classifications` | `isFavorite ASC`, `updatedAt DESC` | Favoritas. |
| `movie_classifications` | `categories ARRAY`, `updatedAt DESC` | Filtrar por categoría. |
| `movie_classifications` | `tags ARRAY`, `updatedAt DESC` | Filtrar por etiqueta. |
| `movie_classifications` | `rating ASC`, `updatedAt DESC` | "Mejor valoradas". |

Los índices de un solo campo (`updatedAt`) los crea Firestore automáticamente.

---

## 7. Reglas de seguridad (`firestore.rules`)

Principios:

1. **Deny por defecto** (`match /{document=**} { allow read, write: if false }`).
2. **Un nivel de confianza para el usuario**: `isAccountOwner(uid)` = autenticado y
   `request.auth.uid == uid`. Habilita cuenta privada, clasificaciones, listas, perfil
   público, reseñas y escrituras de catálogo. `isOwner(uid)` es un alias; ya no se
   exige `email_verified` porque la app crea la identidad sola y el usuario final
   no tiene que verificar nada.
3. **Propietario único**: solo `request.auth.uid == userId` puede leer/escribir su
   subárbol `users/{uid}/**`.
4. `list` deshabilitado en `users/{uid}`: no se pueden enumerar cuentas.
5. Validación estricta de forma y tipos con `hasAll`/`hasOnly`, límites de longitud,
   enums cerrados y `updatedAt == request.time` (impide falsificar la fecha).
6. `createdAt` inmutable en updates; `uid` y `movieId` deben coincidir con la ruta.
7. **Un doc por película**: el ID del path debe ser igual a `data.movieId`.

Reglas destacadas:

```
match /users/{userId}/movie_classifications/{movieId} {
  allow get:    if isAccountOwner(userId) && isValidId(movieId);
  allow list:   if isAccountOwner(userId);
  allow create: if isAccountOwner(userId) && isValidMovieClassification(incoming(), userId, movieId)
                && incoming().createdAt == request.time;
  allow update: if isAccountOwner(userId) && isValidMovieClassification(incoming(), userId, movieId)
                && existing().uid == userId && existing().movieId == movieId
                && incoming().createdAt == existing().createdAt;
  allow delete: if isAccountOwner(userId) && isValidId(movieId);
}
```

`DRAFT_firestore.rules` se mantiene idéntico a `firestore.rules`.

---

## 8. Plan de migración

La migración es **idempotente**, por lotes y no destructiva.

1. **Al iniciar sesión** (`MediaContext`):
   - Se hidrata de forma optimista desde `/api/me/library` (caché del servidor).
   - Si `users/{uid}.legacyLibraryMigratedAt` no existe, se suben esas reseñas a
     `movie_classifications` (`onlyMissing: true`).
   - Después se migra la colección legada `user_library` del propio usuario.
   - Se marca `legacyLibraryMigratedAt`.
2. **Fuente de verdad**: al terminar, `subscribeToUserLibrary` reemplaza el estado
   local con lo que hay en Firestore (tiempo real).
3. **Red de seguridad**: si la migración falla (`failed > 0`) y la nube está vacía, la
   suscripción **no** borra los datos locales.
4. **Lotes de 400** escrituras (`writeBatch`), muy por debajo del límite de 500.
5. **No sobrescribe** clasificaciones ya existentes (`onlyMissing`), por lo que puede
   ejecutarse varias veces sin pérdida de datos.
6. **Migración global** (`migrateAllLegacyLibraries`) para administradores.
7. La colección `user_library` se conserva como respaldo; puede borrarse cuando todos
   los usuarios hayan migrado.

Mapeo de estados y valores:

| UI (`UserReview`) | Firestore |
| --- | --- |
| `pendiente` | `pending` |
| `en_proceso` | `watching` |
| `terminada` | `watched` |
| (no visible) | `discarded` |
| `si_totalmente` | `yes` |
| `quizas` | `maybe` |
| `no_suficiente` / `jamas` | `no` |
| `recommendation: 'si'` | `'yes'` |
| `recommendation: 'quizas'` | `'maybe'` |

---

## 9. Consultas principales (equivalencias)

```ts
// Toda mi lista, en vivo
onSnapshot(
  query(collection(db, 'users', uid, 'movie_classifications'), orderBy('updatedAt', 'desc')),
  (snap) => { /* … */ },
);

// Favoritas
query(coll, where('isFavorite', '==', true), orderBy('updatedAt', 'desc'));

// Pendientes
query(coll, where('status', '==', 'pending'), orderBy('updatedAt', 'desc'));

// Por categoría
query(coll, where('categories', 'array-contains', 'Cine de autor'), orderBy('updatedAt', 'desc'));

// Mejor valoradas (≥ 4)
query(coll, where('rating', '>=', 4), orderBy('updatedAt', 'desc'));

// Conteo por estado (sin descargar documentos)
getCountFromServer(query(coll, where('status', '==', 'watched')));

// Detalle
getDoc(doc(db, 'users', uid, 'movie_classifications', mediaId));
```

> Todas las consultas con `where` + `orderBy('updatedAt')` necesitan el índice
> correspondiente de la sección 6.

---

## 10. Errores comunes y cómo se evitan

| Error | Causa | Mitigación implementada |
| --- | --- | --- |
| `permission-denied` al guardar | Reglas sin desplegar o sin sesión de Firebase | Mensaje claro + desplegar reglas antes de probar; basta la sesión, no el email verificado. |
| `failed-precondition` | Falta un índice compuesto | `firestore.indexes.json` + mensaje que apunta al archivo. |
| Duplicados de la misma película | ID compuesto o auto-ID | ID de documento = `mediaId`. |
| Documento huérfano | Película borrada del catálogo | El catálogo se resuelve por ID; la UI ignora IDs desconocidos y se puede limpiar con `deleteClassification`. |
| Clasificación sin cuenta | Escritura antes de crear `users/{uid}` | `AuthContext` espera `ensureUserAccount` antes de marcar `isAuthReady`. |
| `createdAt` falsificado | Cliente envía su propia fecha | Regla: `createdAt == request.time` en create e inmutable en update. |
| `updatedAt` desfasado | Reloj del cliente | `serverTimestamp()` + regla `updatedAt == request.time`. |
| Pérdida de datos al migrar | Fallo parcial y nube vacía | `migrationOk` evita reemplazar el estado local. |
| Escrituras > 500 por lote | Migración masiva | Lotes de 400. |
| Strings gigantes | Texto libre | `clampString` en cliente + límites en reglas. |

---

## 11. Pasos de prueba

### 11.1 Despliegue (obligatorio antes de probar)

```bash
firebase deploy --only firestore:rules,firestore:indexes --project screeamlog
```

> Sin este paso, todas las escrituras a `users/**` fallarán con `permission-denied`.
> Los índices tardan unos minutos en construirse.

### 11.2 Verificación automática

```bash
npm run lint     # tsc --noEmit
npm run build    # vite + esbuild
```

### 11.3 Prueba manual (usuario normal)

1. Inicia sesión con un usuario normal de la app (no hace falta verificar el email).
2. En Firestore debe aparecer `users/{uid}` con `preferences: {}`.
3. Añade una película a "Mi lista" → debe crearse
   `users/{uid}/movie_classifications/{mediaId}` con `status`, `schemaVersion: 1` y
   timestamps de servidor.
4. Cambia estado, nota, favorito, categorías y etiquetas → el mismo documento se
   actualiza (no se crean duplicados).
5. Recarga en otro navegador → la lista aparece igual (Firestore es la fuente).
6. Quita la película → el documento desaparece.
7. Revisa la consola: no debe haber `permission-denied` ni `failed-precondition`.

### 11.4 Prueba de seguridad

1. Con la sesión de A, intenta leer `users/{uidB}` → `permission-denied`.
2. Intenta crear `users/{uidA}/movie_classifications/x` con `uid: uidB` → denegado.
3. Intenta escribir `updatedAt` con una fecha manual → denegado.
4. Intenta escribir `rating: 9` → denegado.
5. Usuario autenticado sin email verificado → puede escribir su biblioteca, su perfil
   público, sus reseñas y títulos del catálogo; lo que no puede es suplantar a otro
   usuario (`request.auth.uid` debe coincidir siempre).

### 11.5 Migración

1. Crea previamente un doc en `user_library/{uid_mediaId}`.
2. Inicia sesión → debe aparecer su equivalente en `movie_classifications` y
   `users/{uid}.legacyLibraryMigratedAt`.
3. Recarga → no se duplica ni se sobrescribe nada.

---

## 12. Notas de compatibilidad

- `/api/me/library` y `server/store.ts` siguen existiendo como caché/respaldo; ya no
  son la fuente de verdad de la lista.
- `user_library` queda en solo lectura/borrado para la migración.
- `catalog_media` no cambia: sigue siendo la única fuente de datos de las películas.
- Las mejoras previas (Novela, dashboard, CineMatch, tráiler inline, fases 0–5) no se
  tocan.
