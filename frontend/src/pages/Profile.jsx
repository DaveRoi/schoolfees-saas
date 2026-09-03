import { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext.jsx';
import { api } from '../api/client.js';
import { useLang } from '../i18n.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { t } = useLang();
  const [secret, setSecret] = useState(null);
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
    } catch (e) { setError(e.message); }
  };

  const confirmMfa = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/auth/mfa/confirm', { method: 'POST', body: { code } });
      setMsg(t('profile.mfaActive'));
      setUser({ ...user, mfa_enabled: true });
      setSecret(null); setCode('');
    } catch (err) { setError(err.message); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    if (pwd.new_password !== pwd.new_password2) return setError('✗');
    if (pwd.new_password.length < 8) return setError('✗ 8');
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
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 className="page-title">{t('profile.title')}</h1>
      <p className="page-sub">{t('profile.sub')}</p>

      {msg && <div className="alert ok" style={{ marginBottom: 12 }}>{msg}</div>}
      {error && <div className="alert error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card">
        <div className="grid cols-2">
          <div><span className="mini">{t('register.fullName')}</span><div><b>{user.full_name}</b></div></div>
          <div><span className="mini">{t('login.email')}</span><div><b>{user.email}</b></div></div>
          <div><span className="mini">{t('register.phone')}</span><div><b>{user.phone || '—'}</b></div></div>
          <div><span className="mini">{t('parent.detail.status')}</span><div><b>{t(`role.${user.role}`)}</b></div></div>
          {user.school?.name && <div><span className="mini">{t('profile.school')}</span><div><b>{user.school.name}</b></div></div>}
          {user.school?.code && <div><span className="mini">{t('profile.schoolCode')}</span><div><b>{user.school.code}</b></div></div>}
        </div>
      </div>

      <div className="card mt">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('profile.changePwd')}</h3>
        <form onSubmit={changePassword}>
          <div className="grid cols-3">
            <div className="field">
              <label>{t('profile.current')}</label>
              <input type="password" value={pwd.current_password} onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })} required />
            </div>
            <div className="field">
              <label>{t('profile.new')}</label>
              <input type="password" value={pwd.new_password} onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })} minLength={8} required />
            </div>
            <div className="field">
              <label>{t('profile.confirm')}</label>
              <input type="password" value={pwd.new_password2} onChange={(e) => setPwd({ ...pwd, new_password2: e.target.value })} minLength={8} required />
            </div>
          </div>
          <button className="btn primary">{t('profile.edit')}</button>
        </form>
      </div>

      {sessions && sessions.length > 0 && (
        <div className="card mt">
          <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('profile.devices')}</h3>
          <div className="table-wrap">
            <table className="responsive-table">
              <thead><tr><th>{t('profile.device')}</th><th>IP</th><th>{t('profile.connectedOn')}</th><th></th></tr></thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td data-label={t('profile.device')}><span className="mini">{(s.user_agent || '—').slice(0, 60)}</span></td>
                    <td><span className="mini">{s.ip || '—'}</span></td>
                    <td data-label={t('profile.connectedOn')}><span className="mini">{new Date(s.created_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR')}</span></td>
                    <td><button className="btn ghost sm" onClick={() => revokeSession(s.id)}>{t('profile.disconnect')}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card mt">
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>{t('profile.mfa')}</h3>
        {user.mfa_enabled ? (
          <p className="mini">{t('profile.mfaActive')}</p>
        ) : secret ? (
          <form onSubmit={confirmMfa}>
            <p className="mini" style={{ marginBottom: 10 }}>
              1. Google Authenticator / FreeOTP<br />2. 🔑 :
            </p>
            <div className="alert info" style={{ fontFamily: 'monospace', fontSize: 14, wordBreak: 'break-all' }}>{secret}</div>
            <div className="field mt">
              <label>3. {t('login.mfaCode')}</label>
              <input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ fontSize: 20, textAlign: 'center', letterSpacing: 6 }} required />
            </div>
            <button className="btn primary lg">{t('profile.mfaConfirm')}</button>
          </form>
        ) : (
          <>
            <p className="mini" style={{ marginBottom: 12 }}>{t('profile.mfaDesc')}</p>
            <button className="btn primary" onClick={setupMfa}>{t('profile.mfaEnable')}</button>
          </>
        )}
      </div>
    </div>
  );
}
