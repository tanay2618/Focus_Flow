import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config.js';
import { db } from './db.js';
import authRoutes from './routes/auth.routes.js';
import taskRoutes from './routes/task.routes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin.split(',').map((o) => o.trim()) }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', database: 'up', uptime: Math.round(process.uptime()), timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'down', timestamp: new Date().toISOString() });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// In production the API can also serve the built React app (run `npm run build` first).
const distDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');
if (config.isProd && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);
