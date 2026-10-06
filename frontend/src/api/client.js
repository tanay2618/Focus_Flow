import axios from 'axios';
import { TOKEN_KEY } from '../utils/constants.js';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15_000,
});

let onUnauthorized = null;
/** The auth context registers a callback here so the axios layer can trigger a logout. */
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

// Attach the stored token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on a normal request means the session is gone: log out. Wrong credentials on the
// sign-in / sign-up screens also return 401 / 4xx, and those must stay on the form instead.
const AUTH_ENDPOINTS = ['/auth/signin', '/auth/signup'];
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? '';
    const isAuthForm = AUTH_ENDPOINTS.some((p) => url.startsWith(p));
    if (error.response?.status === 401 && !isAuthForm) onUnauthorized?.();
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response) return error.response.data?.message || fallback;
  if (error?.request) return "Can't reach the server. Check your connection and try again.";
  return fallback;
}

export const getFieldErrors = (error) => error?.response?.data?.errors ?? {};
