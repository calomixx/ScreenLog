# Arquitectura Firestore — ScreenLog / TakeVault Pro

## Respuesta corta

**Sí, está implementado en la base activa.** La app desplegada usa
`ai-studio-screenlogclasifi-...` y ahí ya están: usuarios, catálogo,
clasificaciones, listas, reglas, índices y servicios TypeScript.

Dos aclaraciones importantes antes de empezar:

1. La colección real se llama **`catalog_media`**, no `movies`. Es el nombre que
   ya tenía la app de AI Studio; mantenerlo evita romper el deploy. En este
   documento “película” = `catalog_media/{movieId}`.
2. Los nombres de las clasificaciones son `movie_classifications` (snake_case),
   no `movieClassifications`. Igualdad de criterio: el ID del documento es el
   `movieId`, que es lo que garantiza un único registro por usuario/película.

---

## 0. Mapa requerimiento → implementación

| Requerimiento | Estado | Dónde |
| --- | --- | --- |
| Usuarios con UID de Firebase Auth | Implementado | `users/{uid}`, `src/lib/firestore/users.ts` |
| Catálogo persistente | Implementado | `catalog_media/{movieId}`, 29 docs en la base activa |
| Clasificación por usuario y película | Implementado | `users/{uid}/movie_classifications/{movieId}` |
| Consultas por estado/rating/categoría/etiqueta | Implementado | `listClassifications()`, `firestore.indexes.json` |
| Listas personalizadas | Implementado | `users/{uid}/lists/{listId}/items/{movieId}` |
| Reglas de seguridad | Implementado y desplegado | `firestore.rules` en **ambas** bases |
| Índices compuestos | Implementado y desplegado | `firestore.indexes.json` en **ambas** bases |
| Tipos TypeScript | Implementado | `src/lib/firestore/schema.ts` |
| Services de acceso | Implementado | `src/lib/firestore/*.ts` |
| Prueba real end-to-end | Implementado | `npm run firebase:verify` |
| Sin localStorage como fuente | Implementado | Firestore manda; localStorage solo se sube al entrar |

---

## 1. Análisis del esquema actual de películas

Conjunto real de campos encontrado en `catalog_media`:

```json
{
  "authorId": "admin_initial_sync",
  "title": "Breaking Bad",
  "originalTitle": "Breaking Bad",
  "type": "serie",
  "year": 2008,
  "director": "Vince Gilligan",
  "synopsis": "...",
  "posterUrl": "https://image.tmdb.org/t/p/w780/...",
  "backdropUrl": "https://image.tmdb.org/t/p/w1280/...",
  "duration": "5 Temporadas (62 eps)",
  "defaultPlatform": "Netflix",
  "genres": ["Crimen", "Drama", "Suspense"],
  "createdAt": "<timestamp>",
  "updatedAt": "<timestamp>"
}
```

Campos opcionales que aparecen en algunas fichas: `cast`, `trailerYoutubeId`,
`streamingPlatforms`, `communityRating`, `communityVotesCount`,
`addedToListCount`, `isFeatured`, `isTrending`, `isTopClassified`,
`seasonsCount`, `episodesCount`, `releaseDate`, `country`, `language`,
`ageRating`, `status`, `tags`, `createdByUserId`, `isCustomUserCreated`,
`lastEditedBy`, `lastEditedAt`.

### Suposiciones declaradas

- **No existe `tmdbId`** como campo. El identificador estable es el ID del
  documento: slug tipo `breaking-bad`, `the-dark-knight-2008`, o
  `custom-<timestamp>-slug` para títulos creados por usuarios.
- **No existe `description`**: el campo equivalente es `synopsis`.
- Los poster/backdrop vienen de TMDB en la URL, pero no se guarda el ID numérico.
  Si mañana hace falta, se agrega `tmdbId` como campo opcional; no es necesario
  para el modelo actual.
- Los campos `rating` / `ratingCount` que estaban en el catálogo viejo se
  quitaron en la sincronización: son datos agregados que las reglas no aceptan
  en escrituras del cliente y además pueden recalcularse.

### Decisión

Mantener `catalog_media` y su ID actual. **No renombrar** la colección: en
Firestore renombrar significa migrar todos los docs y cambiar el bundle
desplegado, con riesgo alto y ningún beneficio funcional.

Duplicados: se evitan porque el ID del documento es determinista. Agregar una
película es `setDoc(doc(db, 'catalog_media', movieId), ...)`, nunca `addDoc()`.

---

## 2. Estructura final

```text
users/{uid}                                  cuenta privada + preferencias
  ├─ private/info                            PII aislada (email)
  ├─ movie_classifications/{movieId}         1 doc por usuario y película
  └─ lists/{listId}
       └─ items/{movieId}                    pertenencia a listas personalizadas

users_public/{uid}                           perfil público SIN email
catalog_media/{movieId}                      catálogo compartido
community_reviews/{reviewId}                 reseñas públicas
user_library/{entryId}                       legado, solo migración/lectura
admins/{uid}                                 marca de administrador
server_users/{id}                            cuentas internas del servidor
                                              (hash/salt; solo Admin SDK)
```

`server_users` es privada: las reglas de cliente la niegan por completo. Guarda
las cuentas de login del servidor para que Cloud Run no las pierda al reiniciar
el contenedor. El panel de administración combina esas cuentas con las que solo
existen en `users/{uid}`.

Base activa: `ai-studio-screenlogclasifi-...`. Base heredada: `(default)`.
Ambas tienen las mismas reglas y los mismos índices. El catálogo fue copiado a
la activa.

---

## 3. Por qué esta opción y no las otras

| Opción | Ventaja | Desventaja | Veredicto |
| --- | --- | --- | --- |
| `users/{uid}/movie_classifications/{movieId}` | La ruta ya es el dueño: reglas simples. El ID evita duplicados. Borrar usuario = borrar su subárbol. No replica datos de la película. | No se puede consultar “todas las clasificaciones de todos” sin `collectionGroup`. | **Elegida** |
| `users/{uid}/lists/{listId}/items/{movieId}` | Ideal para listas custom. | No sirve como modelo principal: obliga a elegir una lista por película y complica estado/favorito global. | Complementaria |
| Raíz `userMovies/{uid_movieId}` | Consulta global fácil con `collectionGroup`. | El dueño va en un campo, no en la ruta: las reglas son más frágiles y el borrado en cascada es manual. | Descartada |
| Denormalizar la película dentro de cada clasificación | Modo offline más simple. | Cada cambio de título/póster obliga a actualizar N documentos. | Descartada; se guarda solo `movieId` |

Favorito **no es un estado**: es un booleano ortogonal (`isFavorite`). Así una
película vista puede seguir siendo favorita sin duplicar documentos.

Estados soportados: `pending`, `watching`, `watched`, `discarded`.
`watchlist` se modela como `pending`; `favorite` como `isFavorite: true`.

---

## 4. Tipos TypeScript

Definidos en `src/lib/firestore/schema.ts` (exportados desde
`src/lib/firestore/index.ts`):

```ts
export type MovieStatus = 'pending' | 'watching' | 'watched' | 'discarded';
export type ClassificationCategory = string;

export interface MovieClassification {
  movieId: string;
  uid: string;
  status: MovieStatus;
  isFavorite: boolean;
  rating: number;              // 0 = sin nota; 0.5–5
  categories: ClassificationCategory[];
  tags: string[];
  notes: string;
  evaluation: string;
  watchedDate: string;
  platform: string;
  wouldRewatch: 'yes' | 'maybe' | 'no' | 'unset';
  favoriteMoment: string;
  shortVerdict: string;
  quote: string;
  recommendation: 'yes' | 'maybe' | 'no' | '';
  moodRecommendation: string;
  favoriteCharacter: string;
  scriptRating: number;
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

export interface UserAccount {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  preferences: UserPreferences;
  legacyLibraryMigratedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CustomList { listId: string; uid: string; name: string; ... }
export interface CustomListItem { movieId: string; position: number; ... }
```

La ficha de catálogo que consume la UI es `MediaItem` (`src/types`), un
superset del documento persistido. El subconjunto persistido en
`catalog_media/{movieId}` es exactamente el permitido por
`isValidCatalogMediaItem` en `firestore.rules`.

---

## 5. Servicios de acceso a datos

| Función | Archivo | Qué hace |
| --- | --- | --- |
| `ensureUserAccount(input)` | `users.ts` | Crea/actualiza `users/{uid}` de forma idempotente |
| `getUserAccount(uid)` / `subscribeUserAccount` | `users.ts` | Lectura puntual / tiempo real |
| `updateUserPreferences(uid, prefs)` | `users.ts` | Solo el dueño |
| `upsertClassification(uid, movieId, input)` | `classifications.ts` | Crea o actualiza; ID = `movieId` |
| `getClassification` / `deleteClassification` | `classifications.ts` | Puntual y borrado |
| `setClassificationStatus` / `setClassificationRating` / `toggleClassificationFavorite` | `classifications.ts` | Acciones rápidas |
| `listClassifications(uid, filters)` | `classifications.ts` | Paginación con `startAfter` |
| `countClassifications(uid, filters)` | `classifications.ts` | `getCountFromServer` |
| `subscribeToClassifications` / `subscribeToFavorites` / `subscribeToStatus` | `classifications.ts` | `onSnapshot` |
| `saveLibraryEntryToFirestore(review)` | `libraryBridge.ts` | Puente con el modelo de UI `UserReview` |
| `createList` / `addItemToList` / … | `lists.ts` | Listas personalizadas |
| `syncFirebaseUserProfile` | `firebase.ts` | Crea `users_public` + privado tras login |
| `publishCommunityReviewToFirestore` / `loadCommunityReviewsFromFirestore` | `firebase.ts` | Reseñas persistentes |
| `saveCatalogMediaToFirestore` / `seedCatalogToFirestore` | `firebase.ts` | Catálogo compartido |

---

## 6. Consultas e índices

| Consulta | Colección | Filtros | Índice | Tipo |
| --- | --- | --- | --- | --- |
| Toda mi biblioteca | `users/{uid}/movie_classifications` | `orderBy updatedAt desc` | automático (1 campo) | `onSnapshot` |
| Favoritos | idem | `isFavorite == true` + `updatedAt desc` | `isFavorite, updatedAt↓` | snapshot / puntual |
| Pendientes | idem | `status == 'pending'` + `updatedAt desc` | `status, updatedAt↓` | snapshot |
| Vistas con nota | idem | `status == 'watched'`, `rating >= 1` + `updatedAt desc` | `status, rating, updatedAt↓` | puntual paginada |
| Por categoría | idem | `categories array-contains X` + `updatedAt desc` | `categories ARRAY_CONTAINS, updatedAt↓` | puntual paginada |
| Por etiqueta | idem | `tags array-contains X` + `updatedAt desc` | `tags ARRAY_CONTAINS, updatedAt↓` | puntual paginada |
| Combinaciones favorito+estado, categoría+estado, etc. | idem | ver `ClassificationFilters` | compuestos adicionales en `firestore.indexes.json` | puntual paginada |
| Buscar ficha | `catalog_media/{movieId}` | por ID | none | `getDoc` |
| Catálogo por tipo/año | `catalog_media` | `type`, `year` | `type, year↓` | puntual |
| Reseñas de la comunidad | `community_reviews` | `rating >= 1`, `<= 5` | automático | puntual |

`ClassificationFilters` permite `status`, `favoriteOnly`, `category`, `tag`,
`minRating`, `limitCount` y `cursor`.

**Limitación real de Firestore:** no hay full-text search. Para “buscar por
título” se usa `getDoc` por ID o prefijo con `orderBy('title')` +
`startAt/endAt`. Para búsqueda real haría falta Algolia/Typesense; no se agregó
porque no está en el alcance de la app.

---

## 7. Integridad de datos

- **Un doc por película:** el ID del documento es `movieId`. No hay dos docs
  para la misma película porque `upsertClassification` usa `setDoc` con ese ID.
- **Sin huérfanos:** la clasificación guarda solo `movieId`, no una copia de la
  ficha. Si la ficha no existe, se rescató un stub con
  `npm run firebase:sync-catalog`.
- **Borrar usuario:** se hace en cascada manual desde un script/Cloud Function
  con Admin SDK (eliminar `users/{uid}` y sus subcolecciones). Firestore **no**
  hace cascada automática.
- **Borrar película:** no se borra la ficha del catálogo; se marcan las
  clasificaciones como `discarded` o se usa soft delete. Así no se pierde el
  historial del usuario.
- **Timestamps:** `createdAt` se fija con `serverTimestamp()` y es inmutable;
  `updatedAt` siempre lo escribe el servidor. Las reglas lo exigen.
- **Perfil público:** las escrituras públicas (reseñas, catálogo) exigen que
  exista `users_public/{uid}`; el servicio lo crea automáticamente.
- **Cuentas de login:** el servidor guarda sus cuentas (con `passwordHash` y
  `salt`) en `server_users/{id}`, una colección privada que solo toca el Admin
  SDK. Es un respaldo: si el hosting no tiene permisos de Firestore, el
  servidor lo desactiva solo y no reintenta en cada petición.
- **Respaldo real del login:** al registrarse o entrar, el navegador crea la
  identidad de Firebase Auth con una contraseña derivada
  (`sl!` + SHA-256 de `screenlog|email|contraseña`). Firebase Auth es
  permanente. Si el servidor perdió la cuenta, `/api/auth/login` la recupera
  verificando esas credenciales contra la API pública de Firebase y recrea el
  registro local con el mismo UID. Probado: una cuenta que solo existía en
  Firebase Auth pudo entrar después de borrarla del JSON.
- **Panel de administración:** lista los usuarios directamente desde Firestore
  con la sesión del navegador (regla `users → list: if isAdmin()`), así que
  muestra a todos aunque el servidor se haya reiniciado. Los administradores se
  marcan con `npm run firebase:seed-admins` (documento `admins/{uid}`).
- **Diagnóstico:** `GET /api/db-status` devuelve cantidades del JSON y de
  Firestore (`users`, `catalogMedia`, `reviews`, `serverUsers`) para comprobar
  la conexión sin exponer datos privados.

---

## 8. Reglas de seguridad

Archivo: `firestore.rules`, desplegado en `(default)` y en la base activa.
Puntos clave:

```text
match /users/{userId} {
  get    → isAccountOwner(userId) || isAdmin()
  list   → isAdmin()   // panel de administración (lee desde Firestore)
  create → isAccountOwner(userId) && createdAt == request.time && campos válidos
  update → isAccountOwner(userId) && uid/createdAt inmutables
  delete → isAccountOwner(userId) || isAdmin()

  match /movie_classifications/{movieId} {
    get/list/create/update/delete → isAccountOwner(userId)
    create/update → uid == userId, movieId coincide, createdAt inmutable
  }
}
match /users_public/{userId} {
  create/update → isAccountOwner(userId) && sin campos privados
}
match /catalog_media/{movieId} {
  get/list → true
  create   → isSignedIn() && authorId == uid && perfil público existe
}
match /community_reviews/{reviewId} {
  create → isSignedIn() && userId == request.auth.uid && likes == 0
}
```

`isAccountOwner(uid) = request.auth != null && request.auth.uid == uid`.
No se exige email verificado: la app abre la sesión de Firebase sola, sin pasos
manuales para el usuario.

---

## 9. Migración y puesta en marcha

Estado actual (ya ejecutado):

1. Se conservó `catalog_media` de `(default)` (26 docs).
2. Se sincronizó el JSON del servidor (23 docs) a la base activa.
3. Se rescataron películas huérfanas desde clasificaciones → total **29 docs**.
4. Se crearon `users/{uid}` y `users_public/{uid}` al hacer login.
5. Se desplegaron reglas e índices en ambas bases.
6. Se verificó end-to-end con `npm run firebase:verify`.

Comandos para repetir:

```bash
npm run firebase:sync-catalog                 # catálogo → base activa
npm.cmd run firebase:verify                   # base por defecto
$env:FIRESTORE_DATABASE_ID='ai-studio-...'; npm.cmd run firebase:verify   # base activa
firebase.cmd deploy --only firestore:rules,firestore:indexes --project screeamlog
```

Seed de prueba: el propio `firebase:verify` crea y borra un usuario temporal,
una clasificación, un perfil público, una ficha de catálogo y una reseña.

---

## 10. Ejemplos de documentos

### `users/{uid}`

```json
{
  "uid": "rNtCrm5UeBeUwjnD04RKSbLoB962",
  "displayName": "simon",
  "email": "simon01@gmail.com",
  "photoURL": "",
  "preferences": { "theme": "dark", "language": "es", "favoriteGenres": ["Drama"] },
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

### `catalog_media/{movieId}`

```json
{
  "authorId": "admin_initial_sync",
  "title": "Breaking Bad",
  "type": "serie",
  "year": 2008,
  "director": "Vince Gilligan",
  "synopsis": "…",
  "posterUrl": "https://image.tmdb.org/t/p/w780/…",
  "backdropUrl": "https://image.tmdb.org/t/p/w1280/…",
  "duration": "5 Temporadas (62 eps)",
  "defaultPlatform": "Netflix",
  "genres": ["Crimen", "Drama", "Suspense"],
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

### `users/{uid}/movie_classifications/{movieId}`

```json
{
  "movieId": "por-estas-calles",
  "uid": "rNtCrm5UeBeUwjnD04RKSbLoB962",
  "status": "watched",
  "isFavorite": true,
  "rating": 4.5,
  "categories": ["Para repetir"],
  "tags": ["Banda sonora épica"],
  "notes": "",
  "evaluation": "Excelente (9/10)",
  "watchedDate": "2026-11-26",
  "platform": "Cine",
  "schemaVersion": 1,
  "createdAt": "<server timestamp>",
  "updatedAt": "<server timestamp>"
}
```

### `users/{uid}/lists/{listId}/items/{movieId}`

```json
{ "movieId": "breaking-bad", "position": 0, "addedAt": "<server timestamp>" }
```

---

## 11. Errores comunes evitados

- Guardar la biblioteca en `localStorage` como fuente principal → Firestore manda.
- Usar `addDoc()` para clasificaciones → duplicados. Se usa el `movieId` como ID.
- Repetir los datos de la película en cada usuario → se guarda solo la referencia.
- Exigir `email_verified` en reglas cuando la app crea la sesión sola → se usa
  solo `request.auth.uid`.
- Desplegar reglas a `(default)` pero no a la base que usa la app → ahora se
  despliega a ambas.
- Escribir `updatedAt` desde el cliente → reglas lo exigen igual a `request.time`.
- Consultas con varios filtros sin su índice compuesto → `firestore.indexes.json`.
- Mezclar PII en el perfil público → el email vive en `users/{uid}/private/info`.

---

## 12. Cómo probar persistencia y seguridad

1. `npm.cmd tsc --noEmit` y `npm.cmd run build` → sin errores.
2. `npm.cmd run firebase:check` → Admin SDK OK.
3. `npm.cmd run firebase:verify` → 9 comprobaciones OK en `(default)`.
4. Repetir con `FIRESTORE_DATABASE_ID=ai-studio-...` → 9 OK en la base activa.
5. En la app: entrar, agregar una película, poner favorito/nota, recargar y
   comprobar que sigue igual en otra pestaña (`onSnapshot`).
6. Publicar una reseña, recargar: debe leerse desde `community_reviews`.
7. Firestore Console → intentar escribir en `users/otroUid/...` con la sesión
   del usuario A → `permission-denied` (el verify ya lo comprueba con HTTP 403).
