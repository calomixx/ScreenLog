# Revisión técnica de ScreenLog

Fecha: 2026-11-17
Repositorio revisado: https://github.com/calomixx/ScreenLog.git
Commit base: `ce5ffeb`

## 1. Verificación ejecutada

| Comprobación | Resultado |
| --- | --- |
| `npm install` | OK (495 paquetes). Avisos de paquetes deprecados y de install scripts de esbuild/protobufjs no aprobados. |
| `npm run lint` (`tsc --noEmit`) | OK, 0 errores. |
| Build de cliente (`vite build`) | OK, 3044 módulos; aviso de anotación `@__PURE__` en zod. |
| Arranque del servidor en `:3311` | OK. `/api/health`, `/api/auth/status` y `/api/media` responden 200. |
| Registro + alta de una "novela" | OK, la API aceptó `type: "novela"` y la guardó. |
| Prueba de seguridad de `/api/auth/google` | **Corregido**: sin `idToken` devuelve 400; token forjado devuelve 401. Ya no se acepta uid/email del body. |
| CineMatch con filtro `novela` / `documental` | OK: devuelve 2 novelas y 2 documentales curados. |

No existe suite de tests ejecutable: `package.json` no tiene script `test`, no hay Vitest/Jest/Playwright configurado ni CI en `.github/`. El archivo `firestore.rules.test.ts` solo exporta datos de casos; no los ejecuta.

## 2. Lo que está bien

- **Base de seguridad sólida en auth propia**: `scrypt` con salt, comparación con `timingSafeEqual`, sesiones con token aleatorio y hash SHA-256 en servidor, cookie `httpOnly`, `secure` y `sameSite` en producción.
- **Cifrado de secretos**: AES-256-GCM con IV y auth tag (`server/security.ts`), con secreto de aplicación desde entorno o archivo `0600`.
- **Buen endurecimiento general**: rate limit por IP+identificador persistido entre reinicios, bloqueo temporal de cuenta, auditoría, redacción de secretos en logs, saneado de HTML y control de longitud, comprobación de `Origin` en mutaciones, `TRUSTED_PROXY` opcional.
- **Validación con Zod en servidor** para alta de medios y reseñas, con reglas de negocio (p. ej. estrellas obligatorias al terminar).
- **Modelo de roles claro y documentado** (`owner` / `admin` / `user`) con guards `requireRole`, `ownerOnly`, `staffOnly`.
- **Buen README** (stack, scripts, roles, datos y variables), `.env.example`, endpoints de salud y estructura de proyecto entendible.
- **Frontend cuidado**: React 19 + TypeScript, Tailwind 4, diseño consistente, build con separación de chunks (`vendor-react`, `vendor-firebase`, etc.) y componentes cargados de forma diferida.
- **Reglas de Firestore con validación de campos** y blueprint de datos, además de un spec de casos adversarios (aunque no se ejecute).
- **Persistencia JSON con escritura atómica** (tmp + rename) y cola de escritura para evitar corrupción dentro de un proceso.

## 3. Problemas encontrados

### Críticos

1. **Account takeover en `/api/auth/google`** (`server/routes.ts:1457-1543`).
   **CORREGIDO**: el servidor ahora verifica el ID token de Firebase (`server/firebase-auth.ts`) con las claves públicas de Google y lee `uid`/`email`/`name`/`picture` del token firmado, nunca del body. Sin `idToken` → 400; token inválido → 401.

2. **Cuentas semilla con hashes publicados** (`server/store.ts:205-253`, `285-288`).
   Al arrancar sin `server/data/store.json` se crean `daemon` (owner) y `calomixperceo` (admin) con hashes y sales fijos. Además, `needsSetup` pasa a `false`, por lo que el asistente de creación del Owner nunca aparece.
   Evidencia: en un arranque limpio `/api/auth/status` devolvió `needsSetup:false`.
   **Solución**: no sembrar usuarios; permitir el setup inicial real. Si se necesitan datos demo, que sean opcionales y con contraseña aleatoria.

3. **API key de TMDB hardcodeada** (`server/routes.ts:518`, `TMDB_DEFAULT_KEY`).
   Es un secreto real en el repositorio. **Debe rotarse** y usarse solo `TMDB_API_KEY` desde entorno; si falta, deshabilitar la función con un error claro.

### Altos

4. **Token de sesión expuesto a JavaScript** (`src/lib/api.ts:13-28`, `server/routes.ts:401`, `492`).
   El token se guarda en `localStorage`, se acepta por `Authorization`/`x-session-token` y además se devuelve en `/auth/status`. Cualquier XSS puede exfiltrarlo y anula parte de la ventaja de la cookie `httpOnly`.
   **Solución**: usar solo cookie de sesión (sin token en body ni localStorage) o, si se necesita API token, separarlo y no mezclarlo con la sesión web.

5. **Contradicción de permisos del catálogo** (`server/routes.ts:1091` vs `README.md:41`).
   El README dice que solo Owner/Admin crean o editan catálogo, pero `POST /api/media` solo exige `requireAuth`. Verificado: un usuario recién registrado pudo crear una ficha.
   **Solución**: decidir la política. Si los usuarios pueden proponer títulos, que entren como "pendiente de aprobación"; si no, usar `requireCatalogEditor`.

6. **`PATCH /api/media/:id` no valida con Zod** (`server/routes.ts:1146-1168`).
   Solo sanea con `buildMediaFromBody`, así que se pueden saltar mínimos de título, año, géneros y plataforma que sí exige el alta.
   **Solución**: `mediaFormSchema.safeParse` también en la edición.

7. **CSRF dependiente de `Origin`/`Referer`** (`server/security.ts:173-203`).
   Si no hay cabecera `Origin` ni `Referer`, `isOriginAllowed` devuelve `true`. En producción la cookie usa `SameSite=None`, así que conviene añadir token CSRF de doble envío y no confiar solo en la cabecera.

### Medios

8. **Sin tests ni CI**. El spec de reglas de Firestore no se ejecuta y no hay pruebas de API, store, auth ni UI. Un cambio como añadir un tipo puede romper filtros sin detección.
9. **TypeScript poco estricto** (`tsconfig.json`): sin `strict`, `noUncheckedIndexedAccess`, etc. Abundan `any` (sobre todo en `routes.ts`), lo que reduce el valor de `tsc`.
10. **Bug en estadísticas del panel admin** (`src/components/AdminPanelView.tsx:915,919`): filtra por `m.type === 'movie'` y `'tv'`, valores que no existen en `MediaType`; los contadores siempre darán 0.
11. **Persistencia JSON no apta para producción multinstancia** (`server/store.ts`): cada proceso mantiene su propia caché y escribe el archivo completo. En Cloud Run con varias réplicas hay pérdida de escrituras. Ya existe Drizzle/Postgres en el proyecto, pero no se usa.
12. **Sin paginación** en `/api/media`: devuelve todo el catálogo en cada petición y lo mantiene en memoria.
13. **Sin cabeceras de seguridad**: no hay Helmet, CSP, HSTS ni `X-Content-Type-Options`.
14. **Política de contraseñas débil** (`server/routes.ts:130`): solo 8 caracteres, sin comprobar filtraciones ni complejidad.
15. **Login por prefijo de email/nombre** (`server/store.ts:345-369`): `findUserByIdentifier` acepta el prefijo del correo y el nombre, lo que puede crear ambigüedades entre cuentas. Mejor usuario o email exactos.
16. **Doble fuente de verdad**: JSON local + Firestore (`src/lib/firebase.ts`, `MediaContext`) sin estrategia de conflicto documentada; los cambios pueden divergir.

### Bajos / higiene

17. **Archivos basura versionados**: `dev-server10.err` (6,6 MB), `dev-server*.out/err`, `npm-install.*`, `install-playwright.*`, `check-*.cjs`, `test-db.cjs`, `server.js` generado y `.aistudio/`. Aunque `.gitignore` ya los cubre, siguen en el historial; hay que `git rm --cached`.
18. **Dos lockfiles** (`bun.lock` y `package-lock.json`) y `package.json` con nombre `react-example`.
19. **Componentes monolíticos**: `AdminPanelView.tsx` 107 KB, `DetailModal.tsx` 57 KB, `routes.ts` ~2.600 líneas y 56 endpoints. Dificulta testear y mantener.
20. **`SECURITY.md` sin personalizar** (tabla de versiones de plantilla, sin canal real de reporte).
21. **ETag/caché y SEO**: `robots.txt`/`sitemap.xml` existen, pero conviene revisar metadatos por vista y `Cache-Control` de assets.
22. **Mezcla de idioma en código**: identificadores en inglés, textos y comentarios en español; aceptable, pero conviene fijar una convención.

## 4. Plan de mejora recomendado

**P0 (antes de publicar)**
1. Verificar ID token de Firebase en `/auth/google` y eliminar la confianza en el body.
2. Quitar usuarios semilla y restaurar el setup inicial.
3. Rotar la clave de TMDB y pasarla a entorno.
4. Sacar el token de `localStorage` y dejar solo cookie `httpOnly`.

**P1 (siguiente iteración)**
5. Tests: Vitest + Supertest para validación/auth/rutas, Playwright para flujos críticos, emulador de Firestore para reglas, y GitHub Actions con `lint` + `test` + `build`.
6. Activar `strict` en TypeScript y reducir `any`.
7. Helmet + CSP + HSTS; token CSRF si se mantiene `SameSite=None`.
8. Corregir el filtro `movie`/`tv` del panel y unificar etiquetas de tipo en un solo mapa (`MEDIA_TYPE_LABELS`).

**P2 (escalabilidad)**
9. Migrar el store JSON a Postgres con Drizzle, o como mínimo bloquear instancia única y documentarlo.
10. Paginación, filtros e índices en `/api/media`.
11. Dividir `routes.ts` por dominio (`auth`, `media`, `library`, `admin`) y extraer lógica a servicios.
12. Dividir los componentes grandes de administración y detalle.
13. Definir la relación JSON local ↔ Firestore (una sola fuente de verdad y sincronización explícita).

**P3 (limpieza)**
14. `git rm --cached` de logs/artefactos, un solo lockfile, renombrar el paquete y completar `SECURITY.md`.

## 5. Cambio realizado: categoría "Novela"

Se añadió `novela` como tipo de medio de forma consistente:

- **Modelo y validación**: `src/types.ts`, `src/lib/validation.ts`.
- **Servidor**: `server/routes.ts` (lista permitida, mapeo a `tv` en TMDB y selección de coincidencias).
- **UI de alta/edición**: `AddMediaModal.tsx` y `EditMediaModal.tsx` (opción "Novela", temporadas/episodios y validación de temporadas).
- **Filtros**: `CatalogView.tsx`, `MyListView.tsx`, `SystemDashboardView.tsx`, selector del panel admin.
- **Etiquetas/estilos y badge**: `AdminPanelView.tsx`, `HeroSlider.tsx`.
- **Sincronización**: `src/lib/firebase.ts`, `firestore.rules`, `DRAFT_firestore.rules`, `firebase-blueprint.json`.
- **Esquema**: comentario en `src/db/schema.ts`.

Verificación: `npm run lint` pasa con 0 errores, el build de cliente compila y una prueba real de API creó una ficha con `type: "novela"` correctamente.

> Nota: `server.js` de la raíz es un artefacto de build antiguo y no se editó a mano; se regenera con `npm run build`.
