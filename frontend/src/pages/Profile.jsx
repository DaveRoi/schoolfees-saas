import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { api } from '../api/client.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [secret, setSecret] = useState(null);
  const [otpauth, setOtpauth] = useState(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState(null);
  const [pwd, setPwd] = useState({ current_password: '', new_password: '', new_password2: '' });

  useEffect(() => {
    if (user) api('/auth/sessions').then((d) => setSessions(d.sessions)).catch(() => {});
  }, [user?.mfa_enabled]);

  const setupMfa = async () => {
    setError(''); setMsg('');
    try {
      const d = await api('/auth/mfa/setup', { method: 'POST', body: {} });
      setSecret(d.secret);
      setOtpauth(d.otpauth_url);
    } catch (e) { setError(e.message); }
  };

  const confirmMfa = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/auth/mfa/confirm', { method: 'POST', body: { code } });
      setMsg('MFA activé : un code à 6 chiffres sera demandé à chaque connexion.');
      setUser({ ...user, mfa_enabled: true });
      setSecret(null); setCode('');
    } catch (err) { setError(err.message); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (pwd.new_password !== pwd.new_password2) return setError('Les nouveaux mots de passe ne correspondent pas.');
    if (pwd.new_password.length < 8) return setError('Nouveau mot de passe : 8 caractères minimum.');
    try {
      const d = await api('/auth/change-password', { method: 'POST', body: pwd });
      setMsg(d.message);
      setPwd({ current_password: '', new_password: '', new_password2: '' });
    } catch (err) { setError(err.message); }
  };

  const revokeSession = async (id) => {
    try {
      await api(`/auth/sessions/${id}/revoke`, { method: 'POST', body: {} });
      setSessions(sessions.filter((s) => s.id !== id));
    } catch (err) { setError(err.message); }
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 className="page-title">Mon profil</h1>
      <p className="page-sub">Informations du compte et sécurité.</p>

      {msg && <div className="alert ok" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card">
        <div className="grid cols-2">
          <div><span className="mini">Nom complet</span><div><b>{user.full_name}</b></div></div>
          <div><span className="mini">Email</span><div><b>{user.email}</b></div></div>
          <div><span className="mini">Téléphone</span><div><b>{user.phone || '—'}</b></div></div>
          <div><span className="mini">Rôle</span><div><b>{user.role}</b></div></div>
          {user.school?.name && <div><span className="mini">Établissement</span><div><b>{user.school.name}</b></div></div>}
          {user.school?.code && <div><span className="mini">Code école</span><div><b>{user.school.code}</b></div></div>}
        </div>
      </div>

      <div className="card mt">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>🔑 Changer mon mot de passe</h3>
        <form onSubmit={changePassword} className="grid cols-3" style={{ gap: 10 }}>
          <div className="field">
            <label>Actuel</label>
            <input type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} required />
          </div>
          <div className="field">
            <label>Nouveau</label>
            <input type="password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} minLength={8} required />
          </div>
          <div className="field">
            <label>Confirmer</label>
            <input type="password" value={pwd.new_password2} onChange={(e) => setPwd({ ...pwd, new_password2: e.target.value })} minLength={8} required />
          </div>
          <button className="btn primary" style={{ gridColumn: '1 / -1', justifySelf: 'start' }}>Modifier</button>
        </form>
      </div>

      {sessions && sessions.length > 0 && (
        <div className="card mt">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>📱 Mes appareils connectés</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Appareil</th><th>IP</th><th>Connecté le</th><th></th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td className="mini">{(s.user_agent || 'Inconnu').slice(0, 60)}</td>
                    <td className="mini">{s.ip || '—'}</td>
                    <td className="mini">{new Date(s.created_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR')}</td>
                    <td><button className="btn ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => revokeSession(s.id)}>Déconnecter</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card mt">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>🔐 Authentification multifacteur (MFA)</h3>

        {user.mfa_enabled ? (
          <p className="mini">✅ MFA activé sur ce compte. Un code à 6 chiffres est demandé à chaque connexion.</p>
        ) : secret ? (
          <form onSubmit={confirmMfa}>
            <p className="mini" style={{ marginBottom: 10 }}>
              1. Ouvrez <b>Google Authenticator</b> (ou FreeOTP) → « Ajouter un compte » → « Saisir une clé »<br />
              2. Utilisez cette clé :
            </p>
            <div className="alert info" style={{ fontFamily: 'monospace', fontSize: 15, letterSpacing: 1, wordBreak: 'break-all' }}>{secret}</div>
            <div className="field mt">
              <label>3. Saisissez le code à 6 chiffres généré</label>
              <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 20, textAlign: 'center', letterSpacing: 6 }} placeholder="123456" required />
            </div>
            <button className="btn primary lg">Confirmer et activer</button>
          </form>
        ) : (
          <>
            <p className="mini" style={{ marginBottom: 12 }}>
              Protégez votre compte : activez la vérification en 2 étapes avec une application d'authentification
              (Google Authenticator, FreeOTP…). Recommandé pour tous les comptes staff.
            </p>
            <button className="btn primary" onClick={setupMfa}>Activer la MFA</button>
          </>
        )}
      </div>
    </div>
  );
}
