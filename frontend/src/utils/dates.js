const DAY = 86_400_000;
const pad = (n) => String(n).padStart(2, '0');

export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
export const addHours = (d, h) => new Date(new Date(d).getTime() + h * 3_600_000);
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** ISO string -> value for <input type="datetime-local"> (local time, minute precision). */
export function toInputValue(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value -> ISO string, or null when empty/invalid. */
export function fromInputValue(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Tomorrow at 23:59: a sensible default for "due by end of day". */
export function defaultDueValue(now = new Date()) {
  const d = addDays(now, 1);
  d.setHours(23, 59, 0, 0);
  return toInputValue(d);
}

export const formatDate = (iso, now = new Date()) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
};
export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const plural = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;

/**
 * Human wording for a due date. `tone` drives the colour: overdue | today | soon | later | done.
 * Overdue is derived here from the date, never read from stored state.
 */
export function describeDue(iso, { now = new Date(), completed = false } = {}) {
  const due = new Date(iso);
  if (completed) return { text: `Was due ${formatDate(iso, now)}`, tone: 'done' };

  if (due < now) {
    const ms = now - due;
    if (ms < 3_600_000) return { text: `Overdue by ${plural(Math.max(1, Math.floor(ms / 60_000)), 'min')}`, tone: 'overdue' };
    if (ms < DAY) return { text: `Overdue by ${plural(Math.floor(ms / 3_600_000), 'hour')}`, tone: 'overdue' };
    return { text: `Overdue by ${plural(Math.floor(ms / DAY), 'day')}`, tone: 'overdue' };
  }

  const dayDiff = Math.round((startOfDay(due) - startOfDay(now)) / DAY);
  if (dayDiff === 0) return { text: `Today, ${formatTime(iso)}`, tone: 'today' };
  if (dayDiff === 1) return { text: `Tomorrow, ${formatTime(iso)}`, tone: 'soon' };
  if (dayDiff < 7) return { text: `In ${dayDiff} days`, tone: 'soon' };
  return { text: `In ${dayDiff} days`, tone: 'later' };
}

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
