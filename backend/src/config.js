import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, '..');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

if (isProd && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

const resolveDbPath = (value) => {
  if (!value) return path.join(backendRoot, 'data', 'focusflow.db');
  if (value === ':memory:') return value;
  return path.resolve(backendRoot, value);
};

export const config = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dbPath: resolveDbPath(process.env.DB_PATH),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  // Low cost in tests keeps the suite fast; production uses a real work factor.
  bcryptRounds: isTest ? 4 : 12,
};
