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

const USER = { id: 1, name: 'Tanay Kulkarni', email: 't@x.com' };
const NOW = new Date(2026, 9, 3, 10, 0, 0);
const hoursFromNow = (h) => new Date(NOW.getTime() + h * 3_600_000).toISOString();
const mk = (id, over = {}) => ({
  id, title: `Task ${id}`, description: '', category: 'Assignment', priority: 'medium', status: 'pending',
  dueDate: hoursFromNow(24), isOverdue: false, createdAt: NOW.toISOString(), ...over,
});

function renderApp(route = '/', { signedIn = true } = {}) {
  if (signedIn) { localStorage.setItem(TOKEN_KEY, 'tok'); authApi.me.mockResolvedValue({ user: USER }); }
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] }); // freeze the clock only, so async waits still work
  vi.setSystemTime(NOW);
  tasksApi.stats.mockResolvedValue({ total: 0, pending: 0, completed: 0, overdue: 0, inProgress: 0 });
  tasksApi.list.mockResolvedValue([]);
});
afterEach(() => vi.useRealTimers());

describe('routing and auth', () => {
  it('redirects signed-out visitors from a protected page to login', async () => {
    renderApp('/tasks', { signedIn: false });
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(tasksApi.list).not.toHaveBeenCalled();
  });

  it('shows a clear error for wrong credentials', async () => {
    authApi.signIn.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email or password' } } });
    renderApp('/login', { signedIn: false });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 't@x.com');
    await user.type(screen.getByLabelText('Password'), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('signs in, stores the token and lands on the dashboard with the user name in the navbar', async () => {
    authApi.signIn.mockResolvedValue({ token: 'jwt-123', user: USER });
    renderApp('/login', { signedIn: false });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 't@x.com');
    await user.type(screen.getByLabelText('Password'), 'Focus1234');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { name: /Tanay/ })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBe('jwt-123');
    expect(screen.getByRole('banner')).toHaveTextContent('Tanay Kulkarni');
  });

  it('logs out from the navbar and returns to login', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});

describe('sign up', () => {
  it('shows inline errors on blur and blocks submit', async () => {
    renderApp('/signup', { signedIn: false });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Full name'), 'A');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'abc');
    await user.type(screen.getByLabelText('Confirm password'), 'xyz');
    await user.tab();
    expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(authApi.signUp).not.toHaveBeenCalled();
  });

  it('creates the account and enters the app', async () => {
    authApi.signUp.mockResolvedValue({ token: 'new-token', user: USER });
    renderApp('/signup', { signedIn: false });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Full name'), 'Tanay Kulkarni');
    await user.type(screen.getByLabelText('Email'), 't@x.com');
    await user.type(screen.getByLabelText('Password'), 'Focus1234');
    await user.type(screen.getByLabelText('Confirm password'), 'Focus1234');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: /Tanay/ })).toBeInTheDocument();
    expect(authApi.signUp).toHaveBeenCalledWith({ name: 'Tanay Kulkarni', email: 't@x.com', password: 'Focus1234', confirmPassword: 'Focus1234' });
  });

  it('shows the server message inline when the email is already taken', async () => {
    authApi.signUp.mockRejectedValue({ response: { status: 409, data: { message: 'An account with this email already exists', errors: { email: 'An account with this email already exists' } } } });
    renderApp('/signup', { signedIn: false });
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Full name'), 'Tanay Kulkarni');
    await user.type(screen.getByLabelText('Email'), 't@x.com');
    await user.type(screen.getByLabelText('Password'), 'Focus1234');
    await user.type(screen.getByLabelText('Confirm password'), 'Focus1234');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument();
  });
});

describe('dashboard', () => {
  it('shows the four stat cards', async () => {
    tasksApi.stats.mockResolvedValue({ total: 12, pending: 7, completed: 5, overdue: 2, inProgress: 1 });
    renderApp('/');
    const summary = await screen.findByRole('region', { name: 'Task summary' });
    const read = (label) => within(summary).getByText(label).parentElement.textContent;
    expect(read('Total tasks')).toContain('12');
    expect(read('Pending')).toContain('7');
    expect(read('Completed')).toContain('5');
    expect(read('Overdue')).toContain('2');
  });

  it('warns when 3 or more unfinished tasks are due within 48 hours', async () => {
    tasksApi.list.mockResolvedValue([mk(1, { dueDate: hoursFromNow(5) }), mk(2, { dueDate: hoursFromNow(20) }), mk(3, { dueDate: hoursFromNow(40) }), mk(4, { dueDate: hoursFromNow(100) })]);
    renderApp('/');
    expect(await screen.findByText(/3 unfinished tasks are due within the next 48 hours/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Do soon' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
  });

  it('stays quiet with only 2 tasks due in 48 hours', async () => {
    tasksApi.list.mockResolvedValue([mk(1, { dueDate: hoursFromNow(5) }), mk(2, { dueDate: hoursFromNow(20) }), mk(3, { dueDate: hoursFromNow(100) })]);
    renderApp('/');
    await screen.findByText('Task 1');
    expect(screen.queryByText(/due within the next 48 hours/)).not.toBeInTheDocument();
  });

  it('asks for the next 7 days only and shows an empty state when nothing is due', async () => {
    renderApp('/');
    expect(await screen.findByText('Nothing due in the next 7 days')).toBeInTheDocument();
    const params = tasksApi.list.mock.calls[0][0];
    expect(params.status).toBe('pending,in_progress');
    expect(new Date(params.dueTo) - new Date(params.dueFrom)).toBe(7 * 24 * 3_600_000);
  });

  it('shows a loading state, then an error with retry when the API fails', async () => {
    tasksApi.stats.mockRejectedValueOnce({ response: { data: { message: 'Database is down' } } });
    renderApp('/');
    expect(screen.getAllByRole('status').some((el) => /Checking your session|Loading/.test(el.textContent))).toBe(true);
    expect(await screen.findByText('Database is down')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Task summary' })).toBeInTheDocument();
  });
});

describe('today page', () => {
  it('orders overdue first, then due today, then high priority', async () => {
    tasksApi.list.mockResolvedValue([
      mk(1, { title: 'High later', priority: 'high', dueDate: hoursFromNow(72) }),
      mk(2, { title: 'Today evening', dueDate: new Date(2026, 9, 3, 20).toISOString() }),
      mk(3, { title: 'Late lab report', priority: 'low', dueDate: hoursFromNow(-30), isOverdue: true }),
      mk(4, { title: 'Low later', priority: 'low', dueDate: hoursFromNow(72) }),
    ]);
    renderApp('/today');
    await screen.findByText('Late lab report');
    const sections = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(sections).toEqual(['Overdue 1', 'Due today 1', 'High priority 1']);
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['Late lab report', 'Today evening', 'High later']);
    expect(screen.queryByText('Low later')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is urgent', async () => {
    renderApp('/today');
    expect(await screen.findByText('You are clear for today')).toBeInTheDocument();
  });
});

describe('all tasks page', () => {
  const list = [
    mk(1, { title: 'Overdue essay', dueDate: hoursFromNow(-10), isOverdue: true, priority: 'urgent', category: 'Assignment' }),
    mk(2, { title: 'Read chapter', status: 'completed', priority: 'low', category: 'Reading' }),
  ];

  it('lists tasks with category, priority, due date and an overdue badge', async () => {
    tasksApi.list.mockResolvedValue(list);
    renderApp('/tasks');
    const row = (await screen.findByText('Overdue essay')).closest('li');
    expect(within(row).getByText('Assignment')).toBeInTheDocument();
    expect(within(row).getByText('Urgent')).toBeInTheDocument();
    expect(within(row).getByText('Overdue')).toBeInTheDocument();
    expect(within(row).getByText(/Overdue by 10 hours/)).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /Mark "Overdue essay" as completed/ })).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: /Edit "Overdue essay"/ })).toHaveAttribute('href', '/tasks/1/edit');
    const done = screen.getByText('Read chapter').closest('li');
    expect(within(done).queryByText('Overdue')).not.toBeInTheDocument();
    expect(within(done).queryByRole('button', { name: /as completed/ })).not.toBeInTheDocument();
  });

  it('sends search and filters to the API', async () => {
    tasksApi.list.mockResolvedValue(list);
    renderApp('/tasks');
    await screen.findByText('Overdue essay');
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Priority'), 'urgent');
    await waitFor(() => expect(tasksApi.list).toHaveBeenLastCalledWith(expect.objectContaining({ priority: 'urgent' })));
    await user.selectOptions(screen.getByLabelText('Status'), 'pending');
    await user.selectOptions(screen.getByLabelText('Category'), 'Assignment');
    await user.type(screen.getByLabelText('Search by title'), 'essay');
    await waitFor(() => expect(tasksApi.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'essay', priority: 'urgent', status: 'pending', category: 'Assignment' })), { timeout: 2000 });
  });

  it('shows distinct empty states for "no tasks" and "no matches"', async () => {
    renderApp('/tasks');
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  });

  it('shows "no matches" with a clear-filters action when filters are active', async () => {
    renderApp('/tasks?priority=low');
    expect(await screen.findByText('No tasks match these filters')).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]);
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
  });

  it('completes a task', async () => {
    tasksApi.list.mockResolvedValue(list);
    tasksApi.complete.mockResolvedValue({ ...list[0], status: 'completed' });
    renderApp('/tasks');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /Mark "Overdue essay" as completed/ }));
    await waitFor(() => expect(tasksApi.complete).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Completed "Overdue essay"')).toBeInTheDocument();
  });

  it('asks for confirmation before deleting', async () => {
    tasksApi.list.mockResolvedValue(list);
    tasksApi.remove.mockResolvedValue({ message: 'Task deleted', id: 1 });
    renderApp('/tasks');
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Delete "Overdue essay"' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Delete this task?')).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Overdue essay');

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(tasksApi.remove).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete "Overdue essay"' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(tasksApi.remove).toHaveBeenCalledWith(1));
    expect(await screen.findByText('Deleted "Overdue essay"')).toBeInTheDocument();
  });
});

describe('add and edit task', () => {
  it('validates the form, then creates the task and shows a success message', async () => {
    tasksApi.create.mockImplementation(async (body) => mk(9, body));
    renderApp('/tasks/new');
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Add task' });

    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(tasksApi.create).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Due date and time'));
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByText('Due date is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'Write DBMS report');
    await user.selectOptions(screen.getByLabelText('Priority'), 'urgent');
    await user.selectOptions(screen.getByLabelText('Category'), 'Lab');
    await user.type(screen.getByLabelText('Due date and time'), '2026-10-05T17:30');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Task added')).toBeInTheDocument();
    expect(tasksApi.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Write DBMS report', priority: 'urgent', category: 'Lab', status: 'pending',
      dueDate: new Date(2026, 9, 5, 17, 30).toISOString(),
    }));
    expect(screen.getByLabelText('Title')).toHaveValue(''); // form reset for the next task
  });

  it('shows server-side field errors from the API', async () => {
    tasksApi.create.mockRejectedValue({ response: { status: 400, data: { message: 'Please fix the highlighted fields', errors: { title: 'Title must be at most 120 characters' } } } });
    renderApp('/tasks/new');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Title'), 'Anything');
    await user.click(screen.getByRole('button', { name: 'Add task' }));
    expect(await screen.findByText('Title must be at most 120 characters')).toBeInTheDocument();
  });

  it('edits a task using the same form, prefilled', async () => {
    tasksApi.get.mockResolvedValue(mk(5, { title: 'Prefilled title', description: 'Notes here', priority: 'high', category: 'Exam', status: 'in_progress', dueDate: new Date(2026, 9, 7, 9, 15).toISOString() }));
    tasksApi.update.mockResolvedValue(mk(5));
    tasksApi.list.mockResolvedValue([]);
    renderApp('/tasks/5/edit');
    const user = userEvent.setup();
    expect(await screen.findByLabelText('Title')).toHaveValue('Prefilled title');
    expect(screen.getByLabelText('Description')).toHaveValue('Notes here');
    expect(screen.getByLabelText('Priority')).toHaveValue('high');
    expect(screen.getByLabelText('Category')).toHaveValue('Exam');
    expect(screen.getByLabelText('Status')).toHaveValue('in_progress');
    expect(screen.getByLabelText('Due date and time')).toHaveValue('2026-10-07T09:15');

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Renamed');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(tasksApi.update).toHaveBeenCalledWith('5', expect.objectContaining({ title: 'Renamed', priority: 'high' })));
    expect(await screen.findByRole('heading', { name: 'All tasks' })).toBeInTheDocument();
    expect(await screen.findByText('Task updated')).toBeInTheDocument();
  });

  it('shows an error state when the task does not exist', async () => {
    tasksApi.get.mockRejectedValue({ response: { status: 404, data: { message: 'Task not found' } } });
    renderApp('/tasks/999/edit');
    expect(await screen.findByText('Task not found')).toBeInTheDocument();
  });
});
