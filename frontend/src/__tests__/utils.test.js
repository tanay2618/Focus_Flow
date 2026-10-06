import { describe, it, expect } from 'vitest';
import { describeDue, toInputValue, fromInputValue, defaultDueValue } from '../utils/dates.js';
import { groupByUrgency, countDueWithin } from '../utils/tasks.js';
import { validateSignUp, validateLogin, validateTaskForm } from '../utils/validators.js';

const now = new Date(2026, 9, 3, 10, 0, 0); // 3 Oct 2026, 10:00 local
const at = (d, h = 0) => new Date(2026, 9, d, h, 0, 0).toISOString();
const task = (id, over) => ({ id, status: 'pending', priority: 'medium', dueDate: at(10), ...over });

describe('describeDue', () => {
  it('flags overdue tasks and says how late they are', () => {
    expect(describeDue(at(3, 8), { now })).toMatchObject({ text: 'Overdue by 2 hours', tone: 'overdue' });
    expect(describeDue(at(1, 10), { now })).toMatchObject({ text: 'Overdue by 2 days', tone: 'overdue' });
    expect(describeDue(new Date(now - 30 * 60_000).toISOString(), { now }).text).toBe('Overdue by 30 mins');
  });
  it('words upcoming deadlines relative to today', () => {
    expect(describeDue(at(3, 18), { now })).toMatchObject({ tone: 'today' });
    expect(describeDue(at(3, 18), { now }).text).toMatch(/^Today,/);
    expect(describeDue(at(4, 9), { now }).text).toMatch(/^Tomorrow,/);
    expect(describeDue(at(6, 9), { now })).toEqual({ text: 'In 3 days', tone: 'soon' });
    expect(describeDue(at(20, 9), { now })).toEqual({ text: 'In 17 days', tone: 'later' });
  });
  it('never reports a completed task as overdue', () => {
    expect(describeDue(at(1, 10), { now, completed: true }).tone).toBe('done');
  });
});

describe('datetime-local helpers', () => {
  it('round-trips local time', () => {
    expect(toInputValue(fromInputValue('2026-10-03T14:30'))).toBe('2026-10-03T14:30');
    expect(fromInputValue('')).toBeNull();
    expect(fromInputValue('not a date')).toBeNull();
  });
  it('defaults to tomorrow at 23:59', () => {
    expect(defaultDueValue(now)).toBe('2026-10-04T23:59');
  });
});

describe('groupByUrgency (Today page)', () => {
  it('puts overdue first, then due today, then high priority, and drops the rest', () => {
    const tasks = [
      task('later-low', { priority: 'low', dueDate: at(9) }),
      task('later-high', { priority: 'high', dueDate: at(9) }),
      task('later-urgent', { priority: 'urgent', dueDate: at(12) }),
      task('today-evening', { dueDate: at(3, 20) }),
      task('today-noon', { dueDate: at(3, 12) }),
      task('overdue-low', { priority: 'low', dueDate: at(1, 9) }),
      task('overdue-urgent', { priority: 'urgent', dueDate: at(2, 9) }),
      task('done', { status: 'completed', dueDate: at(1, 9) }),
    ];
    const g = groupByUrgency(tasks, now);
    expect(g.overdue.map((t) => t.id)).toEqual(['overdue-urgent', 'overdue-low']);
    expect(g.dueToday.map((t) => t.id)).toEqual(['today-noon', 'today-evening']);
    expect(g.highPriority.map((t) => t.id)).toEqual(['later-urgent', 'later-high']);
  });
});

describe('countDueWithin', () => {
  it('counts only unfinished tasks due in the window', () => {
    const tasks = [
      task(1, { dueDate: at(3, 14) }),
      task(2, { dueDate: at(4, 20) }),
      task(3, { dueDate: at(5, 9) }),          // 47h away: inside
      task(4, { dueDate: at(5, 11) }),         // 49h away: outside
      task(5, { dueDate: at(3, 9) }),          // overdue: excluded
      task(6, { status: 'completed', dueDate: at(3, 14) }),
    ];
    expect(countDueWithin(tasks, 48, now)).toBe(3);
  });
});

describe('form validators', () => {
  it('sign-up checks every field', () => {
    const e = validateSignUp({ name: 'A', email: 'nope', password: 'abc', confirmPassword: 'xyz' });
    expect(Object.keys(e)).toEqual(['name', 'email', 'password', 'confirmPassword']);
    expect(validateSignUp({ name: 'Tanay', email: 't@x.com', password: 'Focus1234', confirmPassword: 'Focus1234' })).toEqual({});
    expect(validateSignUp({ name: 'Tanay', email: 't@x.com', password: 'Focus1234', confirmPassword: 'Focus12345' }).confirmPassword).toBe('Passwords do not match');
    expect(validateSignUp({ name: 'Tanay', email: 't@x.com', password: 'onlyletters', confirmPassword: 'onlyletters' }).password).toMatch(/letter and one number/);
  });
  it('login needs email and password', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' }))).toEqual(['email', 'password']);
  });
  it('task form requires title and due date', () => {
    expect(Object.keys(validateTaskForm({ title: ' ', description: '', dueDate: '' }))).toEqual(['title', 'dueDate']);
    expect(validateTaskForm({ title: 'x'.repeat(121), description: '', dueDate: '2026-10-03T10:00' }).title).toMatch(/120/);
    expect(validateTaskForm({ title: 'ok', description: '', dueDate: '2026-10-03T10:00' })).toEqual({});
  });
});
