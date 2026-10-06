import { PRIORITY_RANK } from './constants.js';

export const MAX_BUBBLES = 5;
export const MAX_DOTS = 3;

const pad = (n) => String(n).padStart(2, '0');

/**
 * Local calendar-day key ("YYYY-MM-DD"), built from the local year / month / day.
 * It must never be derived from toISOString(): that is UTC, so a task due at 00:30 local
 * time east of Greenwich (or 23:30 west of it) would land on the neighbouring day.
 */
export function dayKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Always 6 weeks (42 cells), Sunday first, so the grid keeps the same height while
 * browsing months. Days from the neighbouring months fill the gaps (inMonth: false).
 */
export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = 1 - first.getDay(); // day-of-month of the Sunday on or before the 1st (may be <= 0)
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(year, month, startDay + i); // local-time constructor: safe across DST changes
    return { date, key: dayKey(date), day: date.getDate(), inMonth: date.getMonth() === month };
  });
}

/** Within one day: unfinished first, then most important priority, then earliest, then id. */
const byImportance = (a, b) =>
  (a.status === 'completed') - (b.status === 'completed') ||
  PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
  new Date(a.dueDate) - new Date(b.dueDate) ||
  a.id - b.id;

/** Map of local day key -> tasks due that day (sorted by importance). */
export function groupTasksByDay(tasks = []) {
  const map = new Map();
  for (const task of tasks) {
    const key = dayKey(task.dueDate);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(task);
  }
  for (const list of map.values()) list.sort(byImportance);
  return map;
}

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

/**
 * Where to put the bubble stack (position: fixed, viewport coordinates).
 *
 *  - Beside the date: right of it when there is room, otherwise left.
 *    Top-aligned with the date; if the stack would run off the bottom it is bottom-aligned
 *    instead (grows upward) and finally clamped into the viewport.
 *  - If neither side has room (phones) the stack goes below the date, or above it when
 *    below does not fit, horizontally centred on the date and clamped into the viewport.
 *
 * Returns { left, top, side: 'right'|'left'|'below'|'above', vertical: 'down'|'up' }.
 */
export function computeBubblePosition({ anchor, size, viewport, gap = 8, margin = 8 }) {
  const maxLeft = Math.max(margin, viewport.width - margin - size.width);
  const maxTop = Math.max(margin, viewport.height - margin - size.height);

  const fitsRight = anchor.right + gap + size.width <= viewport.width - margin;
  const fitsLeft = anchor.left - gap - size.width >= margin;

  if (fitsRight || fitsLeft) {
    const side = fitsRight ? 'right' : 'left';
    const left = fitsRight ? anchor.right + gap : anchor.left - gap - size.width;
    let top = anchor.top;
    let vertical = 'down';
    if (top + size.height > viewport.height - margin) {
      top = anchor.bottom - size.height;
      vertical = 'up';
    }
    return { left, top: clamp(top, margin, maxTop), side, vertical };
  }

  const left = clamp(anchor.left + anchor.width / 2 - size.width / 2, margin, maxLeft);
  const roomBelow = viewport.height - margin - (anchor.bottom + gap);
  const roomAbove = anchor.top - gap - margin;
  const below = roomBelow >= size.height || (roomAbove < size.height && roomBelow >= roomAbove);
  const top = below ? anchor.bottom + gap : anchor.top - gap - size.height;
  return { left, top: clamp(top, margin, maxTop), side: below ? 'below' : 'above', vertical: below ? 'down' : 'up' };
}
