import { db } from '../db.js';

const SORTS = {
  dueDate: 'due_date',
  createdAt: 'created_at',
  title: 'title COLLATE NOCASE',
  priority: "CASE priority WHEN 'urgent' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END",
};

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');
const marks = (arr) => arr.map(() => '?').join(', ');

/** Overdue is derived: due date passed and not completed. It is never stored. */
export const toTask = (row, now = new Date()) =>
  row && {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isOverdue: row.status !== 'completed' && new Date(row.due_date) < now,
  };

const COLUMNS = { title: 'title', description: 'description', category: 'category', priority: 'priority', status: 'status', dueDate: 'due_date' };

export const TaskModel = {
  list(userId, f = {}, now = new Date()) {
    const where = ['user_id = ?'];
    const params = [userId];

    if (f.search) { where.push("title LIKE ? ESCAPE '\\'"); params.push(`%${escapeLike(f.search)}%`); }
    for (const key of ['status', 'priority', 'category']) {
      if (f[key]?.length) { where.push(`${key} IN (${marks(f[key])})`); params.push(...f[key]); }
    }
    if (f.overdue === true) { where.push("status != 'completed' AND due_date < ?"); params.push(now.toISOString()); }
    if (f.overdue === false) { where.push("NOT (status != 'completed' AND due_date < ?)"); params.push(now.toISOString()); }
    if (f.dueFrom) { where.push('due_date >= ?'); params.push(f.dueFrom); }
    if (f.dueTo) { where.push('due_date <= ?'); params.push(f.dueTo); }

    const dir = f.order === 'desc' ? 'DESC' : 'ASC';
    const sql = `SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY ${SORTS[f.sort] ?? SORTS.dueDate} ${dir}, id ${dir}`;
    return db.prepare(sql).all(...params);
  },

  /** Every lookup is scoped by user_id so one user can never reach another user's task. */
  findOne: (userId, id) => db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, userId),

  create(userId, data) {
    const ts = new Date().toISOString();
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO tasks (user_id, title, description, category, priority, status, due_date, completed_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(userId, data.title, data.description, data.category, data.priority, data.status, data.dueDate,
        data.status === 'completed' ? ts : null, ts, ts);
    return this.findOne(userId, lastInsertRowid);
  },

  update(userId, id, data) {
    const sets = [];
    const params = [];
    for (const [key, col] of Object.entries(COLUMNS)) {
      if (data[key] !== undefined) { sets.push(`${col} = ?`); params.push(data[key]); }
    }
    const ts = new Date().toISOString();
    if (data.status !== undefined) {
      sets.push('completed_at = ?');
      params.push(data.status === 'completed' ? ts : null);
    }
    sets.push('updated_at = ?');
    params.push(ts, id, userId);
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND user_id = ?`).run(...params);
    return this.findOne(userId, id);
  },

  complete(userId, id) {
    const ts = new Date().toISOString();
    db.prepare("UPDATE tasks SET status = 'completed', completed_at = COALESCE(completed_at, ?), updated_at = ? WHERE id = ? AND user_id = ?")
      .run(ts, ts, id, userId);
    return this.findOne(userId, id);
  },

  remove: (userId, id) => db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, userId).changes > 0,

  /** "pending" means unfinished (pending + in_progress), so total = pending + completed. */
  stats(userId, now = new Date()) {
    const r = db
      .prepare(
        `SELECT COUNT(*) AS total,
                COALESCE(SUM(status != 'completed'), 0) AS pending,
                COALESCE(SUM(status = 'completed'), 0) AS completed,
                COALESCE(SUM(status = 'in_progress'), 0) AS inProgress,
                COALESCE(SUM(status != 'completed' AND due_date < ?), 0) AS overdue
         FROM tasks WHERE user_id = ?`,
      )
      .get(now.toISOString(), userId);
    return r;
  },
};
