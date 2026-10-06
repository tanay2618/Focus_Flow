import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { authApi, tasksApi } from '../api/endpoints.js';
import { TOKEN_KEY } from '../utils/constants.js';

vi.mock('../api/endpoints.js', () => ({
  authApi: { signIn: vi.fn(), signUp: vi.fn(), me: vi.fn() },
  tasksApi: { list: vi.fn(), stats: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), complete: vi.fn(), remove: vi.fn() },
}));

const NOW = new Date(2026, 9, 3, 10, 0, 0);
const at = (d, h = 12) => new Date(2026, 9, d, h).toISOString();
const mk = (id, over = {}) => ({ id, title: `Task ${id}`, description: '', category: 'Assignment', priority: 'medium', status: 'pending', dueDate: at(5), isOverdue: false, ...over });

const upcoming = [mk(1, { title: 'Soon A', dueDate: at(4) }), mk(2, { title: 'Soon B', dueDate: at(6), priority: 'high' })];
const everything = [
  mk(10, { title: 'Past unfinished', dueDate: at(1), isOverdue: true }),
  mk(11, { title: 'Past done', dueDate: at(2), status: 'completed' }),
  ...upcoming,
  mk(12, { title: 'Later this month', dueDate: at(28), priority: 'low' }),
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  localStorage.setItem(TOKEN_KEY, 'tok');
  authApi.me.mockResolvedValue({ user: { id: 1, name: 'Tanay Kulkarni', email: 't@x.com' } });
  tasksApi.stats.mockResolvedValue({ total: 5, pending: 4, completed: 1, overdue: 1, inProgress: 0 });
  // The first list call is "Do soon" (filtered); the second is the calendar's (everything).
  tasksApi.list.mockImplementation(async (params = {}) => (params.status ? upcoming : everything));
});
afterEach(() => vi.useRealTimers());

const renderDashboard = () => render(
  <MemoryRouter initialEntries={['/']}><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></MemoryRouter>,
);

describe('dashboard with the task calendar', () => {
  it('keeps the existing "Do soon" request exactly as it was and adds one unfiltered request for the calendar', async () => {
    renderDashboard();
    await screen.findByRole('region', { name: 'Task calendar' });
    expect(tasksApi.list).toHaveBeenCalledTimes(2);
    const [first, second] = tasksApi.list.mock.calls.map((c) => c[0]);
    expect(first.status).toBe('pending,in_progress');
    expect(new Date(first.dueTo) - new Date(first.dueFrom)).toBe(7 * 24 * 3_600_000);
    expect(second).toEqual({ sort: 'dueDate' });
    expect(tasksApi.stats).toHaveBeenCalledTimes(1);
  });

  it('places the calendar below the stat cards and the Do soon task cards', async () => {
    renderDashboard();
    const calendar = await screen.findByRole('region', { name: 'Task calendar' });
    const summary = screen.getByRole('region', { name: 'Task summary' });
    const doSoon = screen.getByRole('heading', { name: 'Do soon' });
    const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
    expect(summary.compareDocumentPosition(calendar) & FOLLOWING).toBeTruthy();
    expect(doSoon.compareDocumentPosition(calendar) & FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2); // the two Do soon task cards, unchanged
    expect(within(calendar).getByRole('heading', { level: 2 })).toHaveTextContent(/October\s+2026/);
  });

  it('shows past, completed and upcoming tasks on the calendar, from the data it fetched', async () => {
    renderDashboard();
    const calendar = await screen.findByRole('region', { name: 'Task calendar' });
    const overdue = [...calendar.querySelectorAll('.cal__day--overdue')].map((d) => d.querySelector('.cal__num').textContent);
    expect(overdue).toEqual(['1']);
    expect(calendar.querySelectorAll('.cal__day--has')).toHaveLength(5); // Oct 1, 2, 4, 6 and 28
  });

  it('the existing dashboard features still render alongside it', async () => {
    renderDashboard();
    await screen.findByRole('region', { name: 'Task calendar' });
    const summary = screen.getByRole('region', { name: 'Task summary' });
    expect(within(summary).getByText('Total tasks').parentElement).toHaveTextContent('5');
    expect(screen.getByText('Soon A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark "Soon A" as completed/ })).toBeInTheDocument();
  });

  it('completing a task refreshes the calendar data too', async () => {
    tasksApi.complete.mockResolvedValue({});
    renderDashboard();
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Mark "Soon A" as completed/ }));
    await waitFor(() => expect(tasksApi.complete).toHaveBeenCalledWith(1));
    await waitFor(() => expect(tasksApi.list).toHaveBeenCalledTimes(4)); // 2 initial + 2 after reload
  });

  it('a failing calendar request shows the same retry state as the rest of the dashboard', async () => {
    tasksApi.list.mockImplementation(async (params = {}) => { if (!params.status) throw { response: { data: { message: 'Database is down' } } }; return upcoming; });
    renderDashboard();
    expect(await screen.findByText('Database is down')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
