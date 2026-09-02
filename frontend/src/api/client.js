const TOKEN_KEY = 'sf_token';
const REFRESH_KEY = 'sf_refresh';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(accessToken, refreshToken) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

/** Appel API avec rafraîchissement automatique du token si expiré. */
export async function api(path, { method = 'GET', body } = {}) {
  let res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && localStorage.getItem(REFRESH_KEY)) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await fetch(`/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (res.status === 401) {
    clearSession();
    window.location.href = '/login';
    throw new Error('Session expirée');
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `Erreur ${res.status}`);
  return data;
}

/** Ouvre un PDF/CSV dans un nouvel onglet AVEC le token (sinon 401). */
export function openProtectedFile(path) {
  fetch(`/api${path}`, { headers: { Authorization: `Bearer ${getToken()}` } })
    .then((r) => {
      if (!r.ok) throw new Error('Document indisponible');
      return r.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = path.split('/').pop().split('?')[0];
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    })
    .catch((e) => alert(e.message));
}

async function tryRefresh() {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: localStorage.getItem(REFRESH_KEY) }),
    });
    const data = await res.json();
    if (!res.ok) return false;
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const money = (n) => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
export const dt = (s) => (s ? new Date(s.includes('T') ? s : s.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/** Déconnexion propre : révoque la session côté serveur. */
export async function logoutServer() {
  const token = localStorage.getItem(REFRESH_KEY);
  if (!getToken()) return;
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ refreshToken: token }),
    });
  } catch {
    // ignorable : le token expire de toute façon
  }
}
