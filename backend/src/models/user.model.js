import { db } from '../db.js';

const insert = db.prepare(
  'INSERT INTO users (name, email, password_hash, created_at) VALUES (@name, @email, @passwordHash, @createdAt)',
);
const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const byId = db.prepare('SELECT * FROM users WHERE id = ?');

/** Never expose the password hash outside the model layer. */
export const toPublicUser = (row) =>
  row && { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };

export const UserModel = {
  create({ name, email, passwordHash }) {
    const createdAt = new Date().toISOString();
    const { lastInsertRowid } = insert.run({ name, email, passwordHash, createdAt });
    return byId.get(lastInsertRowid);
  },
  findByEmail: (email) => byEmail.get(email),
  findById: (id) => byId.get(id),
};
