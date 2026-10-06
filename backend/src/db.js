import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from './config.js';
import { PRIORITIES, STATUSES, CATEGORIES } from './constants.js';

if (config.dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
}

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const list = (values) => values.map((v) => `'${v}'`).join(', ');

// "overdue" is intentionally not a column: it is derived from due_date + status when read.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    category     TEXT NOT NULL DEFAULT 'Other' CHECK (category IN (${list(CATEGORIES)})),
    priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (${list(PRIORITIES)})),
    status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (${list(STATUSES)})),
    due_date     TEXT NOT NULL,
    completed_at TEXT,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks (user_id, status);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_due    ON tasks (user_id, due_date);
`);

export const closeDb = () => db.close();
