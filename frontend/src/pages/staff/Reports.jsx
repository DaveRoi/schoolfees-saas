import { useEffect, useState } from 'react';
import { api, dt, openProtectedFile } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function StaffReports() {
  const { t } = useLang();
  const [notifs, setNotifs] = useState(null);
  const [audit, setAudit] = useState(null);
  const [tab, setTab] = useState('exports');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState('');
  const [canAudit, setCanAudit] = useState(false);

  useEffect(() => {
    api('/reports/notifications').then((d) => setNotifs(d.notifications)).catch((e) => setError(e.message));
    api('/auth/me').then((d) => setCanAudit(['director', 'admin'].includes(d.user.role))).catch(() => {});
  }, []);

  const loadAudit = () => {
    if (!canAudit) return;
    setTab('audit');
    if (!audit) api('/reports/audit').then((d) => setAudit(d.logs)).catch((e) => setError(e.message));
  };

  if (error) return <div className="alert error">{error}</div>;

  return (
    <>
      <h1 className="page-title">{t('reports.title')}</h1>
      <p className="page-sub">{t('reports.sub')}</p>

      <div className="flex wrap" style={{ marginBottom: 18 }}>
        <button className={`btn ${tab === 'exports' ? 'primary' : 'ghost'}`} onClick={() => setTab('exports')}>{t('reports.exports')}</button>
        <button className={`btn ${tab === 'notifs' ? 'primary' : 'ghost'}`} onClick={() => setTab('notifs')}>{t('reports.notifs')} ({notifs?.length || 0})</button>
        {canAudit && <button className={`btn ${tab === 'audit' ? 'primary' : 'ghost'}`} onClick={loadAudit}>{t('reports.audit')}</button>}
      </div>

      {tab === 'exports' && (
        <div className="grid cols-2">
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t('reports.csvTitle')}</h3>
            <p className="mini" style={{ marginBottom: 14 }}>{t('reports.csvDesc')}</p>
            <button className="btn primary" onClick={() => openProtectedFile('/reports/export/payments.csv')}>
              {t('reports.csvBtn')}
            </button>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>{t('reports.pdfTitle')}</h3>
            <div className="field">
              <label>{t('reports.month')}</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={() => openProtectedFile(`/reports/export/monthly.pdf?month=${month}`)}>
                {t('reports.pdfBtn')}
              </button>
              <button className="btn danger" onClick={() => openProtectedFile('/reports/export/unpaid.pdf')}>
                {t('reports.unpaidBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'notifs' && (
        <div className="card table-wrap">
          {!notifs ? <div className="center"><span className="spinner" /></div> : (
            <table className="responsive-table">
              <thead><tr><th>{t('reports.sentAt')}</th><th>{t('reports.channel')}</th><th>{t('reports.recipient')}</th><th>{t('reports.message')}</th></tr></thead>
              <tbody>
                {notifs.map((n) => (
                  <tr key={n.id}>
                    <td data-label={t('reports.sentAt')}><span className="mini">{dt(n.created_at)}</span></td>
                    <td data-label={t('reports.channel')}><span className={`pill ${n.channel === 'sms' ? 'info' : 'ok'}`}>{n.channel === 'sms' ? 'SMS' : 'WhatsApp'}</span></td>
                    <td data-label={t('reports.recipient')}>{n.recipient_name}<div className="mini">{n.recipient_phone}</div></td>
                    <td data-label={t('reports.message')}><span className="mini" style={{ maxWidth: 420, display: 'block' }}>{n.message}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="card table-wrap">
          {!audit ? <div className="center"><span className="spinner" /></div> : (
            <table className="responsive-table">
              <thead><tr><th>{t('reports.when')}</th><th>{t('reports.user')}</th><th>{t('reports.action')}</th><th>{t('reports.details')}</th><th>IP</th></tr></thead>
              <tbody>
                {audit.map((l) => (
                  <tr key={l.id}>
                    <td data-label={t('reports.when')}><span className="mini">{dt(l.created_at)}</span></td>
                    <td data-label={t('reports.user')}>{l.user_name || '—'}</td>
                    <td data-label={t('reports.action')}><b>{l.action}</b></td>
                    <td data-label={t('reports.details')}><span className="mini" style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details || '—'}</span></td>
                    <td><span className="mini">{l.ip || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
