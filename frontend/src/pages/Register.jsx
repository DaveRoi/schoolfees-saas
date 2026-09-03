import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api/client.js';

export default function Register() {
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
      if (d.school?.active) setSchoolName(`✓ ${d.school.name}${d.school.city ? ` — ${d.school.city}` : ''}`);
      else setSchoolName('⚠ Cette école n\'accepte pas d\'inscriptions actuellement.');
    } catch {
      setSchoolName('✗ Code école inconnu. Demandez-le à l\'établissement.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) return setError('Les deux mots de passe ne correspondent pas.');
    if (form.password.length < 8) return setError('Mot de passe : 8 caractères minimum.');
    setBusy(true);
    try {
      await api('/auth/register', {
        method: 'POST',
        body: { full_name: form.full_name, email: form.email, phone: form.phone, school_code: form.school_code, password: form.password, consent: form.consent },
      });
      // Connexion automatique après inscription
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
        <div className="brand-line"><span style={{ fontSize: '1.2rem' }}>🎓</span> EduPay Cameroun</div>
        <h1>Créer un compte parent</h1>
        <p className="sub">Payez les pensions de vos enfants à distance, suivez vos paiements en temps réel.</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={submit}>
          <div className="field">
            <label>Nom complet</label>
            <input value={form.full_name} onChange={set('full_name')} placeholder="Ex : Jean Atangana" required />
          </div>
          <div className="field">
            <label>Code de votre école</label>
            <input
              value={form.school_code}
              onChange={(e) => { set('school_code')(e); checkCode(e.target.value.trim()); }}
              placeholder="Ex : DEMO2025"
              required
            />
            {schoolName && <span className="mini" style={{ marginTop: 4, display: 'block', color: schoolName.startsWith('✓') ? '#16a34a' : '#dc2626' }}>{schoolName}</span>}
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="vous@exemple.cm" required />
          </div>
          <div className="field">
            <label>Téléphone (MoMo / Orange Money)</label>
            <input value={form.phone} onChange={set('phone')} placeholder="Ex : 677123456" pattern="6[0-9]{8}" title="Numéro camerounais : 6 suivi de 8 chiffres" required />
          </div>
          <div className="field">
            <label>Mot de passe (8 caractères min.)</label>
            <input type="password" value={form.password} onChange={set('password')} minLength={8} required />
          </div>
          <div className="field">
            <label>Confirmez le mot de passe</label>
            <input type="password" value={form.password2} onChange={set('password2')} minLength={8} required />
          </div>
          <div className="field" style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <input type="checkbox" checked={form.consent} onChange={set('consent')} id="consent" required style={{ marginTop: 3 }} />
            <label htmlFor="consent" style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted)' }}>
              J'accepte le traitement de mes données pour la gestion des pensions scolaires (conformité RGPD — droit d'accès et d'effacement garanti).
            </label>
          </div>
          <button className="btn primary lg" disabled={busy}>
            {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : 'Créer mon compte'}
          </button>
        </form>

        <p className="switch">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
