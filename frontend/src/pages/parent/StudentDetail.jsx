import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money, dt } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function StudentDetail() {
  const { id } = useParams();
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api(`/students/${id}`).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [id]);

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const { student, balance } = data;
  const pct = Math.min(100, Math.round((balance.totalPaid / balance.totalDue) * 100));

  return (
    <>
      <div className="flex between wrap">
        <div>
          <h1 className="page-title">{student.first_name} {student.last_name}</h1>
          <p className="page-sub">
            {student.class_name} — {student.gender === 'M' ? t('parent.detail.boy') : t('parent.detail.girl')} — {t('parent.detail.born')} {student.birth_date || '—'}
          </p>
        </div>
        <Link to="/app/mes-enfants" className="btn ghost">← {t('parent.childrenTitle')}</Link>
      </div>

      <div className="grid cols-3">
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('parent.detail.expected')}</span><span className="kpi-icon-badge bg-blue">💰</span></div>
          <span className="kpi-value">{money(balance.totalDue)}</span>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('parent.totalPaid')}</span><span className="kpi-icon-badge bg-green">✅</span></div>
          <span className="kpi-value highlight-green">{money(balance.totalPaid)}</span>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('parent.balance')}</span><span className={`kpi-icon-badge ${balance.balance > 0 ? 'bg-orange' : 'bg-green'}`}>{balance.balance > 0 ? '⏳' : '🎉'}</span></div>
          <span className={`kpi-value ${balance.balance > 0 ? 'highlight-orange' : 'highlight-green'}`}>{money(balance.balance)}</span>
        </div>
      </div>

      <div className="card mt">
        <div className="progress-labels">
          <span>{t('parent.progress')}</span>
          <span className="progress-percent">{pct}%</span>
        </div>
        <div className="progress-bar-container">
          <div className={`progress-bar-fill ${pct < 100 ? (pct === 0 ? 'danger' : 'warning') : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h2 style={{ margin: '26px 0 12px', fontSize: 18 }}>{t('parent.detail.schedule')}</h2>
      <div className="card table-wrap">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>{t('parent.fees')}</th><th>{t('parent.detail.deadline')}</th><th>{t('parent.detail.amount')}</th><th>{t('dash.paidLabel')}</th><th>{t('dash.remainderLabel')}</th><th>{t('parent.detail.status')}</th><th></th>
            </tr>
          </thead>
          <tbody>
            {balance.fees.map((f) => {
              const reste = f.amount - f.paid;
              const late = f.due_date && new Date(f.due_date) < new Date() && reste > 0;
              return (
                <tr key={f.id}>
                  <td data-label={t('parent.fees')}><b>{f.label}</b></td>
                  <td data-label={t('parent.detail.deadline')}>{f.due_date || '—'}</td>
                  <td data-label={t('parent.detail.amount')}>{money(f.amount)}</td>
                  <td data-label={t('dash.paidLabel')} style={{ color: 'var(--ok)' }}>{money(f.paid)}</td>
                  <td data-label={t('dash.remainderLabel')} style={{ color: reste > 0 ? 'var(--danger)' : 'var(--ok)' }}>{money(reste)}</td>
                  <td data-label={t('parent.detail.status')}>
                    {reste <= 0 ? <span className="pill ok">{t('parent.detail.paidStatus')}</span> : late ? <span className="pill danger">{t('parent.detail.late')}</span> : <span className="pill warn">{t('parent.detail.toPay')}</span>}
                  </td>
                  <td>
                    {reste > 0 && (
                      <Link className="btn primary sm" to={`/app/payer/${student.id}/${f.id}`}>
                        {t('parent.detail.pay')}
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mini mt">
        {t('parent.detail.familyInfo')} : {t('parent.detail.father')} — <b>{student.father_name || '—'}</b> · {t('parent.detail.mother')} — <b>{student.mother_name || '—'}</b> · {t('parent.detail.contact')} — <b>{student.guardian_phone}</b>
      </p>
    </>
  );
}
