import { PRIORITIES, STATUSES, CATEGORIES } from '../constants.js';
import { AppError } from './AppError.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isString = (v) => typeof v === 'string';

/** Throws a 400 AppError with a field map when any validator reported a problem. */
export function assertValid(errors, message = 'Please fix the highlighted fields') {
  if (Object.keys(errors).length > 0) throw new AppError(400, message, errors);
}

export function parseDate(value) {
  if (!(isString(value) || typeof value === 'number') || value === '') return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const checkEmail = (raw, errors) => {
  const email = isString(raw) ? raw.trim().toLowerCase() : '';
  if (!email) errors.email = 'Email is required';
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address';
  return email;
};

const checkPassword = (raw, errors) => {
  if (!isString(raw) || raw === '') errors.password = 'Password is required';
  else if (raw.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (Buffer.byteLength(raw) > 72) errors.password = 'Password must be at most 72 bytes';
  else if (!/[A-Za-z]/.test(raw) || !/\d/.test(raw)) {
    errors.password = 'Password must include at least one letter and one number';
  }
  return raw;
};

export function validateSignup(body = {}) {
  const errors = {};
  const name = isString(body.name) ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!name) errors.name = 'Name is required';
  else if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 60) errors.name = 'Name must be at most 60 characters';

  const email = checkEmail(body.email, errors);
  const password = checkPassword(body.password, errors);

  // Optional server-side check of the confirm field; the UI always sends it.
  if (body.confirmPassword !== undefined && body.confirmPassword !== body.password) {
    errors.confirmPassword = 'Passwords do not match';
  }
  assertValid(errors);
  return { name, email, password };
}

export function validateSignin(body = {}) {
  const errors = {};
  const email = checkEmail(body.email, errors);
  if (!isString(body.password) || body.password === '') errors.password = 'Password is required';
  assertValid(errors);
  return { email, password: body.password };
}

// ---- Tasks -----------------------------------------------------------------

const oneOf = (field, value, allowed, errors) => {
  if (!allowed.includes(value)) {
    errors[field] = `${field[0].toUpperCase()}${field.slice(1)} must be one of: ${allowed.join(', ')}`;
    return false;
  }
  return true;
};

const TASK_FIELDS = ['title', 'description', 'category', 'priority', 'status', 'dueDate'];

/**
 * Validates task input. With `partial` only supplied fields are checked (update);
 * otherwise required fields must be present and defaults are applied (create).
 */
export function validateTask(body = {}, { partial = false } = {}) {
  const errors = {};
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (partial && !TASK_FIELDS.some(has)) {
    throw new AppError(400, `Provide at least one field to update: ${TASK_FIELDS.join(', ')}`);
  }

  if (!partial || has('title')) {
    const title = isString(body.title) ? body.title.trim() : '';
    if (!title) errors.title = 'Title is required';
    else if (title.length > 120) errors.title = 'Title must be at most 120 characters';
    else out.title = title;
  }

  if (has('description')) {
    if (!isString(body.description)) errors.description = 'Description must be text';
    else if (body.description.length > 2000) errors.description = 'Description must be at most 2000 characters';
    else out.description = body.description.trim();
  } else if (!partial) out.description = '';

  const enumField = (field, allowed, fallback) => {
    if (has(field)) {
      if (oneOf(field, body[field], allowed, errors)) out[field] = body[field];
    } else if (!partial) out[field] = fallback;
  };
  enumField('category', CATEGORIES, 'Other');
  enumField('priority', PRIORITIES, 'medium');
  enumField('status', STATUSES, 'pending');

  if (!partial || has('dueDate')) {
    if (body.dueDate === undefined || body.dueDate === null || body.dueDate === '') {
      errors.dueDate = 'Due date is required';
    } else {
      const d = parseDate(body.dueDate);
      if (!d) errors.dueDate = 'Due date must be a valid date';
      else out.dueDate = d.toISOString();
    }
  }

  assertValid(errors);
  return out;
}

export function parseTaskId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Task id must be a positive integer');
  return id;
}

const SORT_FIELDS = ['dueDate', 'priority', 'createdAt', 'title'];

export function validateListQuery(query = {}) {
  const errors = {};
  const out = {};

  const csv = (field, allowed) => {
    const raw = query[field];
    if (raw === undefined || raw === '') return;
    if (!isString(raw)) { errors[field] = `${field} must be a single comma-separated value`; return; }
    const values = raw.split(',').map((s) => s.trim()).filter(Boolean);
    const bad = values.filter((v) => !allowed.includes(v));
    if (bad.length) errors[field] = `Invalid ${field} "${bad.join(', ')}". Allowed: ${allowed.join(', ')}`;
    else out[field] = [...new Set(values)];
  };
  csv('status', STATUSES);
  csv('priority', PRIORITIES);
  csv('category', CATEGORIES);

  const search = query.search ?? query.q;
  if (search !== undefined && search !== '') {
    if (!isString(search)) errors.search = 'Search must be text';
    else if (search.length > 100) errors.search = 'Search must be at most 100 characters';
    else out.search = search.trim();
  }

  if (query.overdue !== undefined && query.overdue !== '') {
    if (!['true', 'false'].includes(query.overdue)) errors.overdue = 'overdue must be true or false';
    else out.overdue = query.overdue === 'true';
  }

  for (const field of ['dueFrom', 'dueTo']) {
    if (query[field] === undefined || query[field] === '') continue;
    const d = parseDate(query[field]);
    if (!d) errors[field] = `${field} must be a valid date`;
    else out[field] = d.toISOString();
  }

  out.sort = 'dueDate';
  if (query.sort !== undefined && query.sort !== '') {
    if (!SORT_FIELDS.includes(query.sort)) errors.sort = `sort must be one of: ${SORT_FIELDS.join(', ')}`;
    else out.sort = query.sort;
  }
  out.order = 'asc';
  if (query.order !== undefined && query.order !== '') {
    if (!['asc', 'desc'].includes(query.order)) errors.order = 'order must be asc or desc';
    else out.order = query.order;
  }

  assertValid(errors, 'Invalid query parameters');
  return out;
}
