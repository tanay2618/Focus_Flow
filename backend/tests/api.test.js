import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const { app } = await import('../src/app.js');
const { db, closeDb } = await import('../src/db.js');

let server;
let base;

before(async () => {
  await new Promise((resolve) => { server = app.listen(0, resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise((r) => server.close(r)); closeDb(); });

async function api(path, { method = 'GET', token, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body || raw ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

const hours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
const signup = (name, email) => api('/api/auth/signup', { method: 'POST', body: { name, email, password: 'Passw0rd!', confirmPassword: 'Passw0rd!' } });
const mkTask = (token, over = {}) => api('/api/tasks', { method: 'POST', token, body: { title: 'Task', dueDate: hours(24), ...over } });

let alice; let bob;

test('health check', async () => {
  const r = await api('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'ok');
  assert.equal(r.body.database, 'up');
});

test('sign-up validates input with field-level messages', async () => {
  const r = await api('/api/auth/signup', { method: 'POST', body: { name: 'A', email: 'nope', password: 'short', confirmPassword: 'x' } });
  assert.equal(r.status, 400);
  assert.deepEqual(Object.keys(r.body.errors).sort(), ['confirmPassword', 'email', 'name', 'password']);
  const noNumber = await api('/api/auth/signup', { method: 'POST', body: { name: 'Alice', email: 'a@b.co', password: 'onlyletters' } });
  assert.match(noNumber.body.errors.password, /letter and one number/);
});

test('sign-up hashes the password and returns token + user', async () => {
  const r = await signup('Alice Rao', 'Alice@Example.com');
  assert.equal(r.status, 201);
  assert.ok(r.body.token);
  assert.equal(r.body.user.email, 'alice@example.com');
  assert.equal(r.body.user.passwordHash, undefined);
  assert.equal(r.body.user.password_hash, undefined);
  const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('alice@example.com');
  assert.notEqual(row.password_hash, 'Passw0rd!');
  assert.match(row.password_hash, /^\$2[aby]\$/);
  alice = r.body;
  bob = (await signup('Bob Iyer', 'bob@example.com')).body;
});

test('sign-up rejects a duplicate email (case-insensitive)', async () => {
  const r = await signup('Alice Two', 'ALICE@example.com');
  assert.equal(r.status, 409);
  assert.ok(r.body.errors.email);
});

test('sign-in checks the password', async () => {
  const bad = await api('/api/auth/signin', { method: 'POST', body: { email: 'alice@example.com', password: 'Wrong1234' } });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.message, 'Invalid email or password');
  const unknown = await api('/api/auth/signin', { method: 'POST', body: { email: 'ghost@example.com', password: 'Passw0rd!' } });
  assert.equal(unknown.status, 401);
  assert.equal(unknown.body.message, 'Invalid email or password');
  const ok = await api('/api/auth/signin', { method: 'POST', body: { email: 'alice@example.com', password: 'Passw0rd!' } });
  assert.equal(ok.status, 200);
  assert.ok(ok.body.token);
  assert.equal(ok.body.user.name, 'Alice Rao');
  const empty = await api('/api/auth/signin', { method: 'POST', body: {} });
  assert.equal(empty.status, 400);
});

test('auth middleware: current user, missing / invalid / malformed tokens give 401', async () => {
  const me = await api('/api/auth/me', { token: alice.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, 'alice@example.com');

  for (const token of [undefined, 'garbage.token.value']) {
    const r = await api('/api/auth/me', { token });
    assert.equal(r.status, 401);
    assert.ok(r.body.message);
  }
  const wrongScheme = await fetch(`${base}/api/tasks`, { headers: { Authorization: `Token ${alice.token}` } });
  assert.equal(wrongScheme.status, 401);

  const jwt = (await import('jsonwebtoken')).default;
  const expired = jwt.sign({ sub: '1' }, 'test-secret', { expiresIn: -10 });
  const e = await api('/api/tasks', { token: expired });
  assert.equal(e.status, 401);
  assert.match(e.body.message, /expired/);
  const forged = jwt.sign({ sub: '1' }, 'other-secret');
  assert.equal((await api('/api/tasks', { token: forged })).status, 401);
  const ghost = jwt.sign({ sub: '9999' }, 'test-secret');
  assert.equal((await api('/api/tasks', { token: ghost })).status, 401);
});

test('every task route requires auth', async () => {
  const calls = [['GET', '/api/tasks'], ['GET', '/api/tasks/stats'], ['GET', '/api/tasks/1'], ['POST', '/api/tasks'],
    ['PUT', '/api/tasks/1'], ['PATCH', '/api/tasks/1/complete'], ['DELETE', '/api/tasks/1']];
  for (const [method, path] of calls) {
    const r = await api(path, { method, body: method === 'POST' || method === 'PUT' ? {} : undefined });
    assert.equal(r.status, 401, `${method} ${path}`);
  }
});

test('create task: validation and defaults', async () => {
  const bad = await api('/api/tasks', { method: 'POST', token: alice.token, body: { title: '  ', priority: 'critical', category: 'Nope', status: 'x', dueDate: 'tomorrow-ish' } });
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.body.errors).sort(), ['category', 'dueDate', 'priority', 'status', 'title']);
  const missing = await api('/api/tasks', { method: 'POST', token: alice.token, body: { title: 'x' } });
  assert.equal(missing.body.errors.dueDate, 'Due date is required');

  const ok = await mkTask(alice.token, { title: '  Write report  ' });
  assert.equal(ok.status, 201);
  assert.equal(ok.body.task.title, 'Write report');
  assert.equal(ok.body.task.priority, 'medium');
  assert.equal(ok.body.task.status, 'pending');
  assert.equal(ok.body.task.category, 'Other');
  assert.equal(ok.body.task.isOverdue, false);
});

test('get / update / complete / delete one task', async () => {
  const { body: { task } } = await mkTask(alice.token, { title: 'Lifecycle', priority: 'high' });

  const got = await api(`/api/tasks/${task.id}`, { token: alice.token });
  assert.equal(got.body.task.title, 'Lifecycle');

  const upd = await api(`/api/tasks/${task.id}`, { method: 'PUT', token: alice.token, body: { title: 'Lifecycle v2', status: 'in_progress', priority: 'urgent' } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.task.title, 'Lifecycle v2');
  assert.equal(upd.body.task.status, 'in_progress');
  assert.equal(upd.body.task.priority, 'urgent');
  assert.equal(upd.body.task.category, 'Other'); // untouched fields stay as they were

  const emptyUpdate = await api(`/api/tasks/${task.id}`, { method: 'PUT', token: alice.token, body: {} });
  assert.equal(emptyUpdate.status, 400);
  const badUpdate = await api(`/api/tasks/${task.id}`, { method: 'PUT', token: alice.token, body: { title: '' } });
  assert.equal(badUpdate.status, 400);

  const done = await api(`/api/tasks/${task.id}/complete`, { method: 'PATCH', token: alice.token });
  assert.equal(done.status, 200);
  assert.equal(done.body.task.status, 'completed');
  assert.ok(done.body.task.completedAt);
  const again = await api(`/api/tasks/${task.id}/complete`, { method: 'PATCH', token: alice.token });
  assert.equal(again.body.task.completedAt, done.body.task.completedAt); // idempotent

  const reopen = await api(`/api/tasks/${task.id}`, { method: 'PUT', token: alice.token, body: { status: 'pending' } });
  assert.equal(reopen.body.task.completedAt, null);

  const del = await api(`/api/tasks/${task.id}`, { method: 'DELETE', token: alice.token });
  assert.equal(del.status, 200);
  assert.equal((await api(`/api/tasks/${task.id}`, { token: alice.token })).status, 404);
});

test('tasks are always scoped to the logged-in user', async () => {
  const { body: { task } } = await mkTask(alice.token, { title: 'Alice private' });
  assert.equal((await api(`/api/tasks/${task.id}`, { token: bob.token })).status, 404);
  assert.equal((await api(`/api/tasks/${task.id}`, { method: 'PUT', token: bob.token, body: { title: 'hacked' } })).status, 404);
  assert.equal((await api(`/api/tasks/${task.id}/complete`, { method: 'PATCH', token: bob.token })).status, 404);
  assert.equal((await api(`/api/tasks/${task.id}`, { method: 'DELETE', token: bob.token })).status, 404);
  const bobList = await api('/api/tasks', { token: bob.token });
  assert.equal(bobList.body.count, 0);
  assert.equal((await api('/api/tasks/stats', { token: bob.token })).body.stats.total, 0);
  const still = await api(`/api/tasks/${task.id}`, { token: alice.token });
  assert.equal(still.body.task.title, 'Alice private');
});

test('list: search by title and filters for status, priority, category', async () => {
  const carol = (await signup('Carol Das', 'carol@example.com')).body.token;
  await mkTask(carol, { title: 'Physics lab report', category: 'Lab', priority: 'high', dueDate: hours(10) });
  await mkTask(carol, { title: 'Physics revision', category: 'Exam', priority: 'urgent', status: 'in_progress', dueDate: hours(30) });
  await mkTask(carol, { title: 'Read 100% of chapter_3', category: 'Reading', priority: 'low', status: 'completed', dueDate: hours(50) });
  await mkTask(carol, { title: 'Gym', category: 'Personal', priority: 'low', dueDate: hours(5) });

  const q = async (qs) => (await api(`/api/tasks?${qs}`, { token: carol })).body.tasks.map((t) => t.title);
  assert.equal((await q('')).length, 4);
  assert.deepEqual((await q('search=physics')).sort(), ['Physics lab report', 'Physics revision']);
  assert.deepEqual(await q('search=PHYSICS&category=Lab'), ['Physics lab report']);
  assert.deepEqual(await q('status=completed'), ['Read 100% of chapter_3']);
  assert.deepEqual((await q('status=pending,in_progress')).length, 3);
  assert.deepEqual((await q('priority=low')).sort(), ['Gym', 'Read 100% of chapter_3']);
  assert.deepEqual(await q('priority=urgent&status=in_progress'), ['Physics revision']);
  assert.deepEqual(await q('search=100%25'), ['Read 100% of chapter_3']); // % is literal, not a wildcard
  assert.deepEqual(await q('search=chapter_3'), ['Read 100% of chapter_3']);
  assert.deepEqual(await q('search=%25'), ['Read 100% of chapter_3']);
  assert.deepEqual(await q('search=nothing-matches'), []);
  assert.deepEqual((await q('sort=dueDate&order=asc'))[0], 'Gym');
  assert.deepEqual((await q('sort=priority&order=desc'))[0], 'Physics revision');
  assert.deepEqual(await q(`dueFrom=${encodeURIComponent(hours(0))}&dueTo=${encodeURIComponent(hours(12))}&status=pending`), ['Gym', 'Physics lab report']);

  const bad = await api('/api/tasks?priority=critical&sort=weird', { token: carol });
  assert.equal(bad.status, 400);
  assert.ok(bad.body.errors.priority && bad.body.errors.sort);
});

test('stats: total, pending, completed and overdue (overdue is computed, not stored)', async () => {
  const dave = (await signup('Dave Nair', 'dave@example.com')).body.token;
  await mkTask(dave, { title: 'Past due pending', dueDate: hours(-5) });
  const inProg = await mkTask(dave, { title: 'Past due in progress', status: 'in_progress', dueDate: hours(-1) });
  await mkTask(dave, { title: 'Past due but completed', status: 'completed', dueDate: hours(-48) });
  await mkTask(dave, { title: 'Future', dueDate: hours(72) });

  let s = (await api('/api/tasks/stats', { token: dave })).body.stats;
  assert.deepEqual({ total: s.total, pending: s.pending, completed: s.completed, overdue: s.overdue }, { total: 4, pending: 3, completed: 1, overdue: 2 });

  const overdueList = (await api('/api/tasks?overdue=true', { token: dave })).body.tasks;
  assert.equal(overdueList.length, 2);
  assert.ok(overdueList.every((t) => t.isOverdue));
  const all = (await api('/api/tasks', { token: dave })).body.tasks;
  assert.equal(all.find((t) => t.title === 'Past due but completed').isOverdue, false);

  await api(`/api/tasks/${inProg.body.task.id}/complete`, { method: 'PATCH', token: dave });
  s = (await api('/api/tasks/stats', { token: dave })).body.stats;
  assert.deepEqual({ pending: s.pending, completed: s.completed, overdue: s.overdue }, { pending: 2, completed: 2, overdue: 1 });

  const cols = db.prepare('PRAGMA table_info(tasks)').all().map((c) => c.name);
  assert.ok(!cols.some((c) => c.includes('overdue')), 'overdue must not be a stored column');
});

test('central error handler and 404s', async () => {
  const badJson = await api('/api/auth/signin', { method: 'POST', raw: '{not json' });
  assert.equal(badJson.status, 400);
  assert.match(badJson.body.message, /JSON/);
  const nf = await api('/api/nope');
  assert.equal(nf.status, 404);
  assert.equal(nf.body.success, false);
  assert.equal((await api('/api/tasks/abc', { token: alice.token })).status, 400);
  assert.equal((await api('/api/tasks/99999', { token: alice.token })).status, 404);
});
