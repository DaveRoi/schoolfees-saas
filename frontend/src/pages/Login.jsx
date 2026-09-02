import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../components/AuthContext.jsx';

export default function Login() {
  const { login, loginMfa } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [mfaStep, setMfaStep] = useState(null); // { mfa_token }
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false); // mode "mot de passe oublié"
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
        nav('/');
      } else {
        const d = await login(form.email, form.password);
        if (d.mfa_required) setMfaStep(d);
        else nav('/');
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
        ? `Code envoyé (mode démo : ${d.demo_token}). Saisissez-le ci-dessous avec votre nouveau mot de passe.`
        : 'Code envoyé sur votre téléphone. Saisissez-le ci-dessous avec votre nouveau mot de passe.');
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
        <div className="brand-line">SchoolFees SaaS</div>
        <h1>{mfaStep ? 'Vérification en 2 étapes' : forgot ? 'Mot de passe oublié' : 'Content de vous revoir'}</h1>
        <p className="sub">
          {mfaStep
            ? 'Saisissez le code à 6 chiffres de votre application d\'authentification.'
            : forgot
              ? 'Nous enverrons un code de réinitialisation sur votre téléphone.'
              : 'Connectez-vous pour gérer les pensions scolaires.'}
        </p>

        {error && <div className="alert error">{error}</div>}
        {resetDone && (
          <div className="alert success" style={{ background: '#f0fdf4', border: '1px solid #16a34a', color: '#166534', padding: 12, borderRadius: 10 }}>
            Mot de passe modifié. <Link to="/login" onClick={() => { setForgot(false); setResetDone(false); }}>Connectez-vous</Link>.
          </div>
        )}

        {!forgot && !mfaStep && (
          <form onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.cm" required autoFocus />
            </div>
            <div className="field">
              <label>Mot de passe</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : 'Se connecter'}
            </button>
          </form>
        )}

        {mfaStep && (
          <form onSubmit={submit}>
            <div className="field">
              <label>Code MFA (6 chiffres)</label>
              <input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                style={{ fontSize: 22, textAlign: 'center', letterSpacing: 8 }}
                autoFocus
                required
              />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : 'Vérifier le code'}
            </button>
          </form>
        )}

        {forgot && !resetDone && !forgotMsg && (
          <form onSubmit={requestReset}>
            <div className="field">
              <label>Email du compte</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="vous@exemple.cm" required autoFocus />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Envoyer le code'}
            </button>
          </form>
        )}

        {forgot && !resetDone && forgotMsg && (
          <form onSubmit={doReset}>
            <p className="mini" style={{ marginBottom: 12 }}>{forgotMsg}</p>
            <div className="field">
              <label>Code reçu (SMS)</label>
              <input value={resetCode} onChange={(e) => setResetCode(e.target.value.toUpperCase())} placeholder="ABC123" required autoFocus />
            </div>
            <div className="field">
              <label>Nouveau mot de passe (8 caractères min.)</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} minLength={8} required />
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" /> : 'Définir le nouveau mot de passe'}
            </button>
          </form>
        )}

        <p className="switch">
          {!forgot && !mfaStep ? (
            <>
              Pas encore de compte parent ? <Link to="/register">Créer un compte</Link>
              <br />
              <button type="button" className="linklike" style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: 0, fontSize: 13 }} onClick={() => { setForgot(true); setError(''); }}>
                Mot de passe oublié ?
              </button>
            </>
          ) : (
            <button type="button" className="linklike" style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', padding: 0, fontSize: 13 }} onClick={() => { setForgot(false); setMfaStep(null); setForgotMsg(''); setResetDone(false); setError(''); }}>
              ← Retour à la connexion
            </button>
          )}
        </p>
        <div className="divider" />
        <p className="mini center">
          Comptes démo (mdp : <b>Password123</b>) — parent1@parent.cm · directrice@school.cm · coord@school.cm · admin@school.cm — Code école : <b>DEMO2025</b>
        </p>
      </div>
    </div>
  );
}
