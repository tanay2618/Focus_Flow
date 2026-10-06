import { app } from './app.js';
import { config } from './config.js';
import { closeDb } from './db.js';

const server = app.listen(config.port, () => {
  console.log(`Focus Flow API listening on http://localhost:${config.port} (${config.env})`);
  if (!config.isProd && config.jwtSecret === 'dev-only-secret-change-me') {
    console.warn('Using the built-in development JWT secret. Set JWT_SECRET in backend/.env.');
  }
});

const shutdown = (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(() => { closeDb(); process.exit(0); });
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
