import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, money, openProtectedFile } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function PayFees() {
  const { studentId, feeItemId } = useParams();
  const { t } = useLang();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [method, setMethod] = useState('mtn_momo');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('form');
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
    if (!amt || amt <= 0) return setError(t('pay.invalidAmount'));
    if (amt > reste) return setError(`${t('pay.exceeds')} (${money(reste)}).`);
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
        setMessage(d.message);
      } else {
        setStep('failed');
        setMessage(d.message || t('pay.failedTitle'));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="page-title">{t('pay.title')}</h1>
      <p className="page-sub">
        {data.student.first_name} {data.student.last_name} — {data.student.class_name} — {fee?.label}
      </p>

      {error && <div className="alert error">{error}</div>}

      {step === 'form' && (
        <div className="card">
          <div className="flex between" style={{ marginBottom: 4 }}>
            <span className="mini">{t('pay.remainderOnFee')}</span>
            <b className="kpi-value highlight-orange" style={{ fontSize: '1.1rem' }}>{money(reste)}</b>
          </div>
          <div className="divider" />

          <div className="field">
            <label>{t('pay.chooseMethod')}</label>
            <div className="grid cols-2" style={{ gap: '.7rem' }}>
              <button
                type="button"
                className={`btn ${method === 'mtn_momo' ? 'momo' : 'ghost'}`}
                style={{ flexDirection: 'column', gap: '.2rem', padding: '.9rem' }}
                onClick={() => setMethod('mtn_momo')}
              >
                <span style={{ fontSize: '1.3rem' }}>🟡</span>
                <b>{t('pay.mtn')}</b>
                <span className="mini" style={{ opacity: .7 }}>{t('pay.ussd')}</span>
              </button>
              <button
                type="button"
                className={`btn ${method === 'orange_money' ? 'om' : 'ghost'}`}
                style={{ flexDirection: 'column', gap: '.2rem', padding: '.9rem' }}
                onClick={() => setMethod('orange_money')}
              >
                <span style={{ fontSize: '1.3rem' }}>🟠</span>
                <b>{t('pay.om')}</b>
                <span className="mini" style={{ opacity: .7 }}>{t('pay.webpay')}</span>
              </button>
            </div>
          </div>

          <form onSubmit={start}>
            <div className="field">
              <label>{t('pay.number')}</label>
              <div className="input-with-icon">
                <span className="input-icon">🇨🇲</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6xx xxx xxx" pattern="6[0-9]{8}" required />
              </div>
            </div>
            <div className="field">
              <label>{t('pay.amount')}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min={100} max={reste} required />
              <span className="form-hint">{t('pay.tip')}</span>
            </div>
            <button className="btn emerald lg" disabled={busy}>
              {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : `${t('pay.payBtn')} ${money(amt)}`}
            </button>
          </form>
        </div>
      )}

      {step === 'pending' && (
        <div className="card center">
          <div style={{ fontSize: 44 }}>📲</div>
          <h2 style={{ margin: '10px 0' }}>{t('pay.validateTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14.5, marginBottom: 18 }}>{message}</p>
          <p className="mini">{t('pay.operatorRef')} : <b>{payment?.providerRef}</b></p>
          <button className="btn primary lg" onClick={confirm} disabled={busy}>
            {busy ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,.4)', borderTopColor: '#fff' }} /> : t('pay.validateBtn')}
          </button>
          <p className="mini mt">{t('pay.demoNote')}</p>
        </div>
      )}

      {step === 'done' && (
        <div className="card center">
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ margin: '10px 0' }}>{t('pay.successTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>{message}</p>
          <div className="flex wrap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => openProtectedFile(`/payments/${payment.id}/receipt`)}>
              {t('pay.receipt')}
            </button>
            <button className="btn ghost" onClick={() => nav(`/app/eleve/${studentId}`)}>{t('pay.seeBalance')}</button>
          </div>
        </div>
      )}

      {step === 'failed' && (
        <div className="card center">
          <div style={{ fontSize: 48 }}>❌</div>
          <h2 style={{ margin: '10px 0' }}>{t('pay.failedTitle')}</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 18 }}>{message}</p>
          <div className="flex wrap" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={() => setStep('form')}>{t('pay.retry')}</button>
            <button className="btn ghost" onClick={() => nav(`/app/eleve/${studentId}`)}>{t('common.back')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
