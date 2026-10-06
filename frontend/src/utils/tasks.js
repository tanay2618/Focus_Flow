import { PRIORITY_RANK } from './constants.js';
import { addHours, endOfDay } from './dates.js';

const byDue = (a, b) => new Date(a.dueDate) - new Date(b.dueDate);
const byPriorityThenDue = (a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || byDue(a, b);

/**
 * Today page ordering. Unfinished tasks only:
 *   1. overdue (most important priority first, then oldest)
 *   2. due today (earliest first)
 *   3. high / urgent priority due later
 */
export function groupByUrgency(tasks, now = new Date()) {
  const endToday = endOfDay(now);
  const overdue = [];
  const dueToday = [];
  const highPriority = [];

  for (const task of tasks) {
    if (task.status === 'completed') continue;
    const due = new Date(task.dueDate);
    if (due < now) overdue.push(task);
    else if (due <= endToday) dueToday.push(task);
    else if (PRIORITY_RANK[task.priority] >= PRIORITY_RANK.high) highPriority.push(task);
  }

  return {
    overdue: overdue.sort(byPriorityThenDue),
    dueToday: dueToday.sort(byDue),
    highPriority: highPriority.sort(byPriorityThenDue),
  };
}

/** Unfinished tasks due between now and now + hours (overdue tasks are excluded). */
export function countDueWithin(tasks, hours, now = new Date()) {
  const limit = addHours(now, hours);
  return tasks.filter((t) => {
    if (t.status === 'completed') return false;
    const due = new Date(t.dueDate);
    return due >= now && due <= limit;
  }).length;
}
