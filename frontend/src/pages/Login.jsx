import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../components/AuthContext.jsx';
import { useTheme } from '../components/ThemeContext.jsx';
import { useLang } from '../i18n.jsx';

export default function Login() {
  const { login, loginMfa } = useAuth();
  const { dark, toggle } = useTheme();
  const { t } = useLang();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfaStep, setMfaStep] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [resetDone, setResetDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mfaStep) {
        await loginMfa(mfaStep.mfa_token, code);
        nav('/app');
      } else {
        const d = await login(form.email, form.password);
        if (d.mfa_required) setMfaStep(d);
        else nav('/app');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const d = await api('/auth/password/forgot', { method: 'POST', body: { email: form.email } });
      setForgotMsg(d.demo_token
        ? `${d.message} (démo : ${d.demo_token})`
        : d.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/auth/password/reset', { method: 'POST', body: { email: form.email, code: resetCode, new_password: newPwd } });
      setResetDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="flex between" style={{ marginBottom: '.5rem' }}>
          <div className="brand-line">🎓 EduPay Cameroun</div>
          <button className="theme-toggle" onClick={toggle} title="Light / Dark">{dark ? '☀️' : '🌙'}</button>
        </div>
        <h1>{mfaStep ? t('login.mfaTitle') : forgot ? t('login.forgotTitle') : t('login.welcome')}</h1>
        <p className="sub">
          {mfaStep ? t('login.mfaDesc') : forgot ? t('login.forgotDesc') : t('login.subtitle')}
        </p>

        {error && <div className="alert error">{error}</div>}
        {resetDone && (
          <div className="alert ok">
            {t('login.resetDone')} <Link to="/login" onClick={() => { setForgot(false); setResetDone(false); }}>{t('login.submit')}</Link>.
          </div>
        )}

        {!forgot && !mfaStep && !resetDone && (
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('login.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
            </div>
            <div className="field">
              <label>{t('login.password')}</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" /> : t('login.submit')}
            </button>
          </form>
        )}

        {mfaStep && (
          <form onSubmit={submit}>
            <div className="field">
              <label>{t('login.mfaCode')}</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                style={{ fontSize: 22, textAlign: 'center', letterSpacing: 8 }}
                autoFocus
                required
              />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" /> : t('login.mfaVerify')}
            </button>
          </form>
        )}

        {forgot && !resetDone && !forgotMsg && (
          <form onSubmit={requestReset}>
            <div className="field">
              <label>{t('login.email')}</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoFocus />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" /> : t('login.forgotSend')}
            </button>
          </form>
        )}

        {forgot && !resetDone && forgotMsg && (
          <form onSubmit={doReset}>
            <p className="mini" style={{ marginBottom: 12 }}>{forgotMsg}</p>
            <div className="field">
              <label>{t('login.resetCode')}</label>
              <input value={resetCode} onChange={(e) => setResetCode(e.target.value.toUpperCase())} required autoFocus />
            </div>
            <div className="field">
              <label>{t('login.newPassword')}</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} minLength={8} required />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" /> : t('login.resetSubmit')}
            </button>
          </form>
        )}

        <p className="switch">
          {!forgot && !mfaStep ? (
            <>
              {t('login.noAccount')} <Link to="/register">{t('login.createAccount')}</Link>
              <br />
              <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 13 }} onClick={() => { setForgot(true); setError(''); }}>
                {t('login.forgot')}
              </button>
            </>
          ) : (
            <button type="button" style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: 13 }} onClick={() => { setForgot(false); setMfaStep(null); setForgotMsg(''); setResetDone(false); setError(''); }}>
              {t('login.backToLogin')}
            </button>
          )}
        </p>
        <div className="divider" />
        <p className="mini center">{t('login.demo')}</p>
      </div>
    </div>
  );
}
