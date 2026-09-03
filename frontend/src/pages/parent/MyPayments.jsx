import { useEffect, useState } from 'react';
import { api, money, dt, openProtectedFile } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function MyPayments() {
  const { t } = useLang();
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/payments').then((d) => setPayments(d.payments)).catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!payments) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const total = payments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <h1 className="page-title">{t('payments.historyTitle')}</h1>
      <p className="page-sub">
        {t('payments.historySub')} — {payments.length} {t('payments.operations')}, {money(total)} {t('payments.totalPaid')}.
      </p>

      {payments.length === 0 ? (
        <div className="card empty-state">{t('payments.none')}</div>
      ) : (
        <div className="card table-wrap">
          <table className="responsive-table">
            <thead>
              <tr><th>{t('payments.when')}</th><th>{t('payments.student')}</th><th>{t('payments.fee')}</th><th>{t('parent.detail.amount')}</th><th>{t('payments.method')}</th><th>{t('parent.detail.status')}</th><th>{t('payments.receipt')}</th></tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td data-label={t('payments.when')}>{dt(p.paid_at || p.created_at)}</td>
                  <td data-label={t('payments.student')}><b>{p.first_name} {p.last_name}</b></td>
                  <td data-label={t('payments.fee')}>{p.fee_label || '—'}</td>
                  <td data-label={t('parent.detail.amount')}><b>{money(p.amount)}</b></td>
                  <td data-label={t('payments.method')}>{p.method === 'mtn_momo' ? 'MTN MoMo' : p.method === 'orange_money' ? 'Orange Money' : t('payments.cash')}</td>
                  <td data-label={t('parent.detail.status')}>
                    {p.status === 'success' && <span className="pill ok">{t('payments.statusPaid')}</span>}
                    {p.status === 'pending' && <span className="pill warn">{t('payments.statusPending')}</span>}
                    {p.status === 'failed' && <span className="pill danger">{t('payments.statusFailed')}</span>}
                    {p.status === 'refunded' && <span className="pill info">{t('payments.statusRefunded')}</span>}
                  </td>
                  <td data-label={t('payments.receipt')}>
                    {p.status === 'success' && (
                      <button className="btn ghost sm" onClick={() => openProtectedFile(`/payments/${p.id}/receipt`)}>📄 PDF</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
