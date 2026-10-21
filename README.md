# ScreenLog Pro

Aplicación cinematográfica para catalogar películas y series, registrar visionados, escribir reseñas y descubrir la actividad de la comunidad.

## Stack

- React 19 + TypeScript + Vite 6
- Tailwind CSS 4
- Express 4 con middleware de Vite en desarrollo
- Persistencia JSON en `server/data/store.json`
- Autenticación propia con sesiones en cookie `httpOnly`, hash scrypt y cifrado AES-256-GCM para credenciales de servicio

## Puesta en marcha

```bash
npm install
copy .env.example .env
npm run dev
```

Abre `http://localhost:3000`. En el primer arranque la app muestra el asistente de configuración para crear la cuenta Owner.

### Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor Express + Vite en modo desarrollo |
| `npm run build` | Build de cliente y servidor en `dist/` |
| `npm start` | Ejecuta la build de producción |
| `npm run lint` | Comprobación de tipos con TypeScript |
| `npm run preview` | Vista previa de la build de Vite |

## Roles y permisos

| Rol | Alcance |
| --- | --- |
| `owner` | Propietario único. Gestiona administradores, facturación, credenciales, registros y transferencia de propiedad. |
| `admin` | Gestiona cuentas `user`, moderación, ajustes del sitio y catálogo. No puede gestionar Owner ni otros administradores. |
| `user` | Explora el catálogo, gestiona su biblioteca, reseñas y perfil. |

- El catálogo solo puede crearse o editarse desde cuentas Owner/Admin.
- Nadie puede gestionar, bloquear ni cambiar el rol del Owner.
- Las sesiones ajenas nunca se enumeran; el cierre forzado invalida la sesión de forma silenciosa.

## Datos y respaldo

- El servidor crea `server/data/store.json` automáticamente y siembra el catálogo inicial si está vacío.
- `server/data/` no se versiona. Para respaldar la aplicación, copia esa carpeta.
- Para reiniciar la instalación desde cero, detén el servidor y elimina `server/data/`.
- El catálogo de respaldo del cliente vive en `src/data/initialMedia.ts`; los títulos nuevos se guardan en el servidor.

## Variables de entorno

Consulta `.env.example`. En producción define al menos `NODE_ENV=production`, `APP_URL` y `SESSION_SECRET`.

## Verificación

```bash
npm run lint
npm run build
```

La build puede mostrar una advertencia de tamaño de chunk; no impide el despliegue.
