import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createApiRouter } from './server/routes';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ScreenLog Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();