import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader.jsx';
import { useLang } from '../i18n.jsx';

export default function VerifyReceipt() {
  const { t } = useLang();
  const [number, setNumber] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const r = await fetch(`/api/public/verify/${encodeURIComponent(number.trim())}`);
      const d = await r.json();
      setResult(d);
    } catch {
      setResult({ valid: false, error: t('common.error') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PublicHeader />
      <main className="main-content public-page">
        <div className="verify-wrap">
          <div className="shield-hero">🛡️</div>
          <h1 className="landing-main-title" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
            {t('verify.title1')} <span className="gradient-text">{t('verify.title2')}</span>
          </h1>
          <p className="landing-subtitle">{t('verify.desc')}</p>

          <form className="verify-input-group" onSubmit={verify}>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value.toUpperCase())}
              placeholder="REC-00001"
              required
            />
            <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : t('verify.btn')}</button>
          </form>

          {result && (
            <div className="glass-card" style={{ textAlign: 'left', marginTop: '1rem' }}>
              {result.valid ? (
                <>
                  <div className="pill ok" style={{ marginBottom: 12 }}>{t('verify.valid')}</div>
                  {[
                    [t('profile.school'), result.receipt.school],
                    [t('payments.student'), result.receipt.student],
                    [t('payments.classCol'), result.receipt.class],
                    [t('parent.detail.amount'), `${result.receipt.amount.toLocaleString('fr-FR')} FCFA`],
                    [t('payments.method'), result.receipt.method],
                    [t('payments.when'), new Date(result.receipt.paid_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR')],
                  ].map(([k, v]) => (
                    <div key={k} className="flex between" style={{ padding: '.45rem 0', borderBottom: '1px solid var(--border-color)' }}>
                      <span className="mini">{k}</span>
                      <b style={{ fontSize: '.88rem' }}>{v}</b>
                    </div>
                  ))}
                </>
              ) : (
                <div className="alert error" style={{ marginBottom: 0 }}>{t('verify.invalid')}</div>
              )}
            </div>
          )}

          <p className="mini" style={{ marginTop: '2rem' }}>
            <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('verify.backHome')}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
