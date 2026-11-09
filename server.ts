import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { createApiRouter } from './server/routes';
import { syncRateLimitsFromStore } from './server/security';
import { getStore } from './server/store';

// Load environment variables safely
try {
  const envFile = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile });
  } else {
    dotenv.config();
  }
} catch {
  // Ignore errors reading .env
}

async function startServer() {
  // CONFIG & ENVIRONMENT VALIDATION
  const rawPort = Number(process.env.PORT);
  const PORT = !isNaN(rawPort) && rawPort > 0 && rawPort <= 65535 ? rawPort : 3000;
  if (!process.env.SESSION_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('[CONFIG_WARN] SESSION_SECRET no está configurado en entorno de producción.');
  }

  // SECURITY FIX: restore persisted IP-level rate limits from store
  try {
    const store = await getStore();
    if (store.loginAttempts) syncRateLimitsFromStore(store.loginAttempts);
  } catch { /* ignore — fresh start */ }

  const app = express();

  // Cloud Run / Kubernetes / Docker health check endpoint
  app.get('/healthz', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.use(express.json({ limit: '2mb' }));

  // Mount the unified API router
  app.use('/api', createApiRouter());

  // Error handler for API routes
  app.use('/api', (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('API Error:', err);
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || 'Error interno del servidor';
    const code = err?.code || 'INTERNAL_ERROR';
    res.status(status).json({ success: false, error: message, code });
  });

  const distPath = path.resolve(process.cwd(), 'dist');
  const isDev = process.env.NODE_ENV !== 'production';

  // Vite middleware for development; static assets for production
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScreenLog Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
