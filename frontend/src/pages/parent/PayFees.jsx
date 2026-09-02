import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, money, openProtectedFile } from '../../api/client.js';

export default function PayFees() {
  const { studentId, feeItemId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [method, setMethod] = useState('mtn_momo');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('form'); // form -> pending -> done/failed
  const [payment, setPayment] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/students/${studentId}`).then((d) => {
      setData(d);
      setPhone(d.student.guardian_phone || '');
      const fee = d.balance.fees.find((f) => String(f.id) === String(feeItemId));
      if (fee) setAmount(String(fee.amount - fee.paid));
    }).catch((e) => setError(e.message));
  }, [studentId, feeItemId]);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const fee = data.balance.fees.find((f) => String(f.id) === String(feeItemId));
  const reste = fee ? fee.amount - fee.paid : 0;
  const amt = Math.round(Number(amount) || 0);

  const start = async (e) => {
    e.preventDefault();
    setError('');
    if (!amt || amt <= 0) return setError('Montant invalide.');
    if (amt > reste) return setError(`Le montant dépasse le reste à payer (${money(reste)}).`);
    setBusy(true);
    try {
      const d = await api('/payments/initiate', {
        method: 'POST',
        body: { student_id: Number(studentId), fee_item_id: Number(feeItemId), amount: amt, method, phone },
      });
      setPayment({ id: d.paymentId, providerRef: d.providerRef });
      setMessage(d.ussdPrompt);
      setStep('pending');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      const d = await api(`/payments/${payment.id}/confirm`, { method: 'POST', body: {} });
      if (d.payment.status === 'success') {
        setStep('done');
        setMessage('Paiement réussi ! SMS et WhatsApp envoyés, solde mis à jour.');
      } else {
        setStep('failed');
        setMessage(d.message || 'Paiement refusé par l\'opérateur.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="page-title">Payer la pension</h1>
      <p className="page-sub">
        {data.student.first_name} {data.student.last_name} — {data.student.class_name} — {fee?.label}
      </p>

      {error && <div className="alert error">{error}</div>}

      {step === 'form' && (
        <div className="card">
          <div className="flex between" style={{ marginBottom: 4 }}>
            <span className="mini">Reste à payer sur cette échéance</span>
            <b style={{ color: 'var(--brand)', fontSize: 18 }}>{money(reste)}</b>
          </div>
          <div className="divider" />

          <div className="field">
            <label>Choisissez votre moyen de paiement</label>
            <div className="pay-methods">
              <div className={`pay-method ${method === 'mtn_momo' ? 'selected' : ''}`} onClick={() => setMethod('mtn_momo')}>
                <span className="logo-dot mtn">MTN</span> MTN Mobile Money
              </div>
              <div className={`pay-method ${method === 'orange_money' ? 'selected' : ''}`} onClick={() => setMethod('orange_money')}>
                <span className="logo-dot om">OM</span> Orange Money
              </div>
            </div>
          </div>

          <form onSubmit={start}>
            <div className="field">
              <label>Numéro {method === 'mtn_momo' ? 'MTN' : 'Orange'} à débiter</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6xx xxx xxx" pattern="6[0-9]{8}" required />
            </div>
            <div className="field">
              <label>Montant à payer (FCFA) — total ou partiel</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={100} max={reste} required />
              <span className="mini">Astuce : vous pouvez payer en plusieurs fois.</span>
            </div>
            <button className="btn primary lg" disabled={busy}>
              {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : `Payer ${money(amt)}`}
            </button>
          </form>
        </div>
      )}

      {step === 'pending' && (
        <div className="card center">
          <div style={{ fontSize: 44 }}>📲</div>
          <h2 style={{ margin: '10px 0' }}>Validez sur votre téléphone</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14.5, marginBottom: 18 }}>{message}</p>
          <p className="mini">Réf. opérateur : <b>{payment?.providerRef}</b></p>
          <button className="btn primary lg" onClick={confirm} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : "J'ai validé le code sur mon téléphone"}
          </button>
          <p className="mini mt">Simulation démo : cliquez simplement pour confirmer (95% de succès simulé).</p>
        </div>
      )}

      {step === 'done' && (
        <div className="card center">
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ margin: '10px 0' }}>Paiement confirmé !</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 18 }}>{message}</p>
          <div className="flex center wrap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => openProtectedFile(`/payments/${payment.id}/receipt`)}>
              📄 Télécharger le reçu PDF
            </button>
            <button className="btn ghost" onClick={() => nav(`/eleve/${studentId}`)}>Voir le solde mis à jour</button>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div className="card center">
          <div style={{ fontSize: 48 }}>❌</div>
          <h2 style={{ margin: '10px 0' }}>Paiement échoué</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 18 }}>{message}</p>
          <div className="flex center wrap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => setStep('form')}>Réessayer</button>
            <button className="btn ghost" onClick={() => nav(`/eleve/${studentId}`)}>Retour</button>
          </div>
        </div>
      )}
    </div>
  );
}
