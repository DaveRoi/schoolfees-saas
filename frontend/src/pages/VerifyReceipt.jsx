import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function VerifyReceipt() {
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
      setResult({ valid: false, error: 'Service indisponible. Réessayez.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="verify-wrap">
      <div className="shield-hero">🛡️</div>
      <h1 className="landing-main-title" style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>
        Portail de <span className="gradient-text">Certification des Reçus</span>
      </h1>
      <p className="landing-subtitle">
        Vérifiez instantanément l'authenticité d'une quittance de paiement émise par un établissement partenaire EduPay.
      </p>

      <form className="verify-input-group" onSubmit={verify}>
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value.toUpperCase())}
          placeholder="Ex : REC-00011"
          required
        />
        <button className="btn primary" disabled={busy}>{busy ? <span className="spinner" /> : 'Vérifier'}</button>
      </form>

      {result && (
        <div className="glass-card" style={{ textAlign: 'left', marginTop: '1rem' }}>
          {result.valid ? (
            <>
              <div className="pill ok" style={{ marginBottom: 12 }}>✓ Reçu authentique et validé</div>
              {[
                ['Établissement', result.receipt.school],
                ['Élève', result.receipt.student],
                ['Classe', result.receipt.class],
                ['Montant', `${result.receipt.amount.toLocaleString('fr-FR')} FCFA`],
                ['Moyen de paiement', result.receipt.method],
                ['Payé le', new Date(result.receipt.paid_at.replace(' ', 'T') + 'Z').toLocaleString('fr-FR')],
              ].map(([k, v]) => (
                <div key={k} className="flex between" style={{ padding: '.45rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span className="mini">{k}</span>
                  <b style={{ fontSize: '.88rem' }}>{v}</b>
                </div>
              ))}
            </>
          ) : (
            <div className="alert error" style={{ marginBottom: 0 }}>✗ {result.error}</div>
          )}
        </div>
      )}

      <p className="mini" style={{ marginTop: '2rem' }}>
        <Link to="/" style={{ color: 'var(--primary)', fontWeight: 700 }}>← Retour à l'accueil EduPay</Link>
      </p>
    </div>
  );
}
