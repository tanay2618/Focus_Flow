import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints.js';
import { setUnauthorizedHandler } from '../api/client.js';
import { TOKEN_KEY } from '../utils/constants.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY))); // verifying a saved token
  const [sessionExpired, setSessionExpired] = useState(false);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Axios calls this on a 401 from any protected request.
  useEffect(() => {
    setUnauthorizedHandler(() => { clearSession(); setSessionExpired(true); });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Restore the session after a page reload.
  useEffect(() => {
    if (!token || user) { setLoading(false); return undefined; }
    let cancelled = false;
    authApi.me()
      .then(({ user: me }) => { if (!cancelled) setUser(me); })
      .catch(() => { if (!cancelled) clearSession(); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const startSession = useCallback(({ token: t, user: u }) => {
    localStorage.setItem(TOKEN_KEY, t); // write first: the axios interceptor reads from storage
    setToken(t);
    setUser(u);
    setSessionExpired(false);
    return u;
  }, []);

  const login = useCallback(async (email, password) => startSession(await authApi.signIn({ email, password })), [startSession]);
  const signUp = useCallback(async (payload) => startSession(await authApi.signUp(payload)), [startSession]);
  const logout = useCallback(() => { clearSession(); setSessionExpired(false); }, [clearSession]);

  const value = useMemo(
    () => ({ token, user, loading, sessionExpired, isAuthenticated: Boolean(user), login, signUp, logout }),
    [token, user, loading, sessionExpired, login, signUp, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
