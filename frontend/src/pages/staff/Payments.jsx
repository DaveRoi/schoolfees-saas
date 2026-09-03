import { useEffect, useState } from 'react';
import { api, money, dt, openProtectedFile } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function StaffPayments() {
  const { t } = useLang();
  const [payments, setPayments] = useState(null);
  const [totalCount, setTotalCount] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const load = () => api('/payments').then((d) => { setPayments(d.payments); setTotalCount(d.totalCount); }).catch((e) => setError(e.message));
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!payments) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const total = payments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);
  const realTotal = totalCount ?? payments.length; // le backend plafonne à 500
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePayments = payments.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <>
      <h1 className="page-title">{t('payments.staffTitle')}</h1>
      <p className="page-sub">{realTotal} {t('payments.staffSub')} — {money(total)} {t('payments.collectedLabel')}</p>

      <div className="card table-wrap">
        <table className="responsive-table">
          <thead>
            <tr><th>{t('payments.when')}</th><th>{t('payments.student')}</th><th>{t('payments.classCol')}</th><th>{t('dash.parent')}</th><th>{t('payments.fee')}</th><th>{t('parent.detail.amount')}</th><th>{t('payments.method')}</th><th>{t('parent.detail.status')}</th><th>{t('payments.receipt')}</th></tr>
          </thead>
          <tbody>
            {pagePayments.map((p) => (
              <tr key={p.id}>
                <td data-label={t('payments.when')}><span className="mini">{dt(p.paid_at || p.created_at)}</span></td>
                <td data-label={t('payments.student')}><b>{p.first_name} {p.last_name}</b></td>
                <td data-label={t('payments.classCol')}>{p.class_name}</td>
                <td data-label={t('dash.parent')}>{p.parent_name}</td>
                <td data-label={t('payments.fee')}><span className="mini">{p.fee_label || '—'}</span></td>
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
                    <button className="btn ghost sm" onClick={() => openProtectedFile(`/payments/${p.id}/receipt`)}>📄</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex between wrap" style={{ marginTop: 14, alignItems: 'center' }}>
          <span className="mini">{pagePayments.length} {t('students.showing')} {realTotal}{totalCount > 500 ? ' (500+)' : ''}</span>
          <div className="flex" style={{ gap: '.4rem' }}>
            <button className="btn ghost sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>{t('students.prev')}</button>
            <span className="pill info">{t('students.page')} {safePage} / {totalPages}</span>
            <button className="btn ghost sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>{t('students.next')}</button>
          </div>
        </div>
      )}
    </>
  );
}
