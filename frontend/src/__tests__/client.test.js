import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import { api, setUnauthorizedHandler, getErrorMessage, getFieldErrors } from '../api/client.js';
import { TOKEN_KEY } from '../utils/constants.js';

const original = api.defaults.adapter;
afterEach(() => { api.defaults.adapter = original; setUnauthorizedHandler(null); });

const respond = (status, data = {}) => async (config) => {
  if (status >= 400) throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, { status, data, config, headers: {} });
  return { data, status, statusText: 'OK', headers: {}, config };
};

describe('axios instance', () => {
  let seen;
  beforeEach(() => { seen = null; });

  it('adds the stored token to every request', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi');
    api.defaults.adapter = async (config) => { seen = config.headers.get('Authorization'); return respond(200)(config); };
    await api.get('/tasks');
    expect(seen).toBe('Bearer abc.def.ghi');
  });

  it('sends no Authorization header when signed out', async () => {
    api.defaults.adapter = async (config) => { seen = config.headers.get('Authorization'); return respond(200)(config); };
    await api.get('/tasks');
    expect(seen).toBeFalsy();
  });

  it('logs the user out on a 401 from a protected route', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    api.defaults.adapter = respond(401, { message: 'Invalid authentication token.' });
    await expect(api.get('/tasks')).rejects.toBeTruthy();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('does not log out when sign-in itself returns 401 (wrong credentials)', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    api.defaults.adapter = respond(401, { message: 'Invalid email or password' });
    await expect(api.post('/auth/signin', {})).rejects.toBeTruthy();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('does not log out on other errors', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    api.defaults.adapter = respond(500, { message: 'boom' });
    await expect(api.get('/tasks')).rejects.toBeTruthy();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('error helpers', () => {
  it('reads server messages, field errors and network failures', () => {
    expect(getErrorMessage({ response: { data: { message: 'Nope' } } })).toBe('Nope');
    expect(getErrorMessage({ request: {} })).toMatch(/reach the server/);
    expect(getErrorMessage(new Error('x'), 'Fallback')).toBe('Fallback');
    expect(getFieldErrors({ response: { data: { errors: { email: 'Taken' } } } })).toEqual({ email: 'Taken' });
    expect(getFieldErrors({})).toEqual({});
  });
});
