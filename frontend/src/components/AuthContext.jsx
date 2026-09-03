import { createContext, useContext, useState } from 'react';
import { api, saveSession, clearSession, getToken, logoutServer } from '../api/client.js';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!getToken()) return null;
    // Hydrate au premier rendu via /auth/me
    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => {
        clearSession();
        setUser(null); // sinon spinner infini dans Protected
      });
    return undefined; // undefined = chargement
  });

  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    if (d.mfa_required) return d; // le gère Login page
    saveSession(d.accessToken, d.refreshToken);
    setUser(d.user);
    return d;
  };

  const loginMfa = async (mfaToken, code) => {
    const d = await api('/auth/mfa/verify', { method: 'POST', body: { mfa_token: mfaToken, code } });
    saveSession(d.accessToken, d.refreshToken);
    setUser(d.user);
    return d;
  };

  const logout = async () => {
    try {
      await logoutServer();
    } finally {
      clearSession();
      setUser(null);
    }
  };

  return <AuthCtx.Provider value={{ user, setUser, login, loginMfa, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
