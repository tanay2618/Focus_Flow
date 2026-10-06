import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AxiosError } from 'axios';
import { MemoryRouter } from 'react-router-dom';
import App from '../App.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ToastProvider } from '../context/ToastContext.jsx';
import { api } from '../api/client.js';
import { TOKEN_KEY } from '../utils/constants.js';

// Unlike app.test.jsx this does NOT mock the endpoints: requests go through the real axios
// instance (interceptors included) and only the network adapter is replaced.
const original = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = original; });

const reply = (config, status, data) => {
  if (status >= 400) throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, data, config, headers: {} });
  return { data, status, statusText: 'OK', headers: {}, config };
};

const mount = (route) => render(
  <MemoryRouter initialEntries={[route]}><AuthProvider><ToastProvider><App /></ToastProvider></AuthProvider></MemoryRouter>,
);

describe('session handling through axios', () => {
  it('restores a saved session on reload and sends the token', async () => {
    localStorage.setItem(TOKEN_KEY, 'good-token');
    const auth = [];
    api.defaults.adapter = async (config) => {
      auth.push(config.headers.get('Authorization'));
      if (config.url === '/auth/me') return reply(config, 200, { user: { id: 1, name: 'Tanay K', email: 't@x.com' } });
      if (config.url === '/tasks/stats') return reply(config, 200, { stats: { total: 1, pending: 1, completed: 0, overdue: 0 } });
      return reply(config, 200, { tasks: [] });
    };
    mount('/');
    expect(await screen.findByRole('heading', { name: /Tanay/ })).toBeInTheDocument();
    expect(auth.every((h) => h === 'Bearer good-token')).toBe(true);
  });

  it('an invalid saved token ends the session and shows the login page', async () => {
    localStorage.setItem(TOKEN_KEY, 'stale-token');
    api.defaults.adapter = async (config) => reply(config, 401, { message: 'Invalid authentication token.' });
    mount('/tasks');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('a 401 in the middle of a session logs the user out with a notice', async () => {
    localStorage.setItem(TOKEN_KEY, 'expiring-token');
    api.defaults.adapter = async (config) => {
      if (config.url === '/auth/me') return reply(config, 200, { user: { id: 1, name: 'Tanay K', email: 't@x.com' } });
      return reply(config, 401, { message: 'Your session has expired. Please sign in again.' });
    };
    mount('/');
    expect(await screen.findByText('Your session ended. Sign in again to continue.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
