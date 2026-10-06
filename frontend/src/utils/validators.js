import { fromInputValue } from './dates.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// These rules mirror the backend validators so users see the same message before and after submit.
const validateEmail = (email) => {
  const v = (email ?? '').trim();
  if (!v) return 'Email is required';
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address';
  return '';
};

const validatePassword = (password) => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password must include at least one letter and one number';
  return '';
};

const compact = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

export function validateSignUp({ name, email, password, confirmPassword }) {
  const n = (name ?? '').trim();
  return compact({
    name: !n ? 'Name is required' : n.length < 2 ? 'Name must be at least 2 characters' : n.length > 60 ? 'Name must be at most 60 characters' : '',
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: !confirmPassword ? 'Confirm your password' : confirmPassword !== password ? 'Passwords do not match' : '',
  });
}

export function validateLogin({ email, password }) {
  return compact({
    email: validateEmail(email),
    password: password ? '' : 'Password is required',
  });
}

export function validateTaskForm({ title, description, dueDate }) {
  const t = (title ?? '').trim();
  return compact({
    title: !t ? 'Title is required' : t.length > 120 ? 'Title must be at most 120 characters' : '',
    description: (description ?? '').length > 2000 ? 'Description must be at most 2000 characters' : '',
    dueDate: !dueDate ? 'Due date is required' : !fromInputValue(dueDate) ? 'Enter a valid due date' : '',
  });
}
