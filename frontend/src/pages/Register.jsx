import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api/client.js';
import { useTheme } from '../components/ThemeContext.jsx';
import { useLang } from '../i18n.jsx';

export default function Register() {
  const { dark, toggle } = useTheme();
  const { t } = useLang();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', school_code: '', password: '', password2: '', consent: false });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [schoolName, setSchoolName] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const checkCode = async (code) => {
    setSchoolName('');
    if (!code || code.length < 4) return;
    try {
      const d = await api(`/schools/by-code/${encodeURIComponent(code)}`);
      setSchoolName(d.school?.active ? `✓ ${d.school.name}` : `⚠ ${d.school?.name}`);
    } catch {
      setSchoolName(t('register.badCode'));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) return setError(t('common.errorMismatch'));
    if (form.password.length < 8) return setError(t('common.errorLength'));
    setBusy(true);
    try {
      await api('/auth/register', {
        method: 'POST',
        body: { full_name: form.full_name, email: form.email, phone: form.phone, school_code: form.school_code, password: form.password, consent: form.consent },
      });
      const d = await api('/auth/login', { method: 'POST', body: { email: form.email, password: form.password } });
      saveSession(d.accessToken, d.refreshToken);
      nav('/app');
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
        <h1>{t('register.title')}</h1>
        <p className="sub">{t('register.subtitle')}</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>{t('register.fullName')}</label>
            <input value={form.full_name} onChange={set('full_name')} required />
          </div>
          <div className="field">
            <label>{t('register.schoolCode')}</label>
            <input
              value={form.school_code}
              onChange={(e) => { set('school_code')(e); checkCode(e.target.value.trim()); }}
              placeholder="DEMO2025"
              required
            />
            {schoolName && (
              <span className="mini" style={{ marginTop: 4, display: 'block', color: schoolName.startsWith('✓') ? 'var(--success)' : 'var(--danger)' }}>
                {schoolName}
              </span>
            )}
          </div>
          <div className="field">
            <label>{t('login.email')}</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label>{t('register.phone')}</label>
            <input value={form.phone} onChange={set('phone')} placeholder="6xx xxx xxx" pattern="6[0-9]{8}" required />
          </div>
          <div className="field">
            <label>{t('register.password')}</label>
            <input type="password" value={form.password} onChange={set('password')} minLength={8} required />
          </div>
          <div className="field">
            <label>{t('register.confirm')}</label>
            <input type="password" value={form.password2} onChange={set('password2')} minLength={8} required />
          </div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <input type="checkbox" checked={form.consent} onChange={set('consent')} id="consent" required style={{ marginTop: 3 }} />
            <label htmlFor="consent" style={{ fontWeight: 400, fontSize: 13, color: 'var(--text-muted)' }}>
              {t('register.consent')}
            </label>
          </div>
          <button className="btn primary lg" disabled={busy}>
            {busy ? <span className="spinner" /> : t('register.submit')}
          </button>
        </form>

        <p className="switch">
          {t('register.haveAccount')} <Link to="/login">{t('login.submit')}</Link>
        </p>
      </div>
    </div>
  );
}
