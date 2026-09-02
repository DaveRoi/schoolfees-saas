import { useEffect, useState } from 'react';
import { api, dt, openProtectedFile } from '../../api/client.js';

export default function StaffReports() {
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
      <h1 className="page-title">Rapports & exports</h1>
      <p className="page-sub">Clôture mensuelle, journal des notifications et rapports d'audit.</p>

      <div className="flex wrap" style={{ marginBottom: 18 }}>
        <button className={`btn ${tab === 'exports' ? 'primary' : 'ghost'}`} onClick={() => setTab('exports')}>📥 Exports</button>
        <button className={`btn ${tab === 'notifs' ? 'primary' : 'ghost'}`} onClick={() => setTab('notifs')}>🔔 Notifications ({notifs?.length || 0})</button>
        {canAudit && <button className={`btn ${tab === 'audit' ? 'primary' : 'ghost'}`} onClick={loadAudit}>🛡️ Audit</button>}
      </div>

      {tab === 'exports' && (
        <div className="grid cols-2">
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Encaissements (CSV)</h3>
            <p className="mini" style={{ marginBottom: 14 }}>Export complet avec élèves, classes, parents, montants et références opérateur.</p>
            <button className="btn primary" onClick={() => openProtectedFile('/reports/export/payments.csv')}>
              ⬇️ Télécharger le CSV
            </button>
          </div>
          <div className="card">
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Clôture mensuelle (PDF)</h3>
            <div className="field">
              <label>Mois de clôture</label>
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <button className="btn primary" onClick={() => openProtectedFile(`/reports/export/monthly.pdf?month=${month}`)}>
              ⬇️ Télécharger le PDF
            </button>
          </div>
        </div>
      )}

      {tab === 'notifs' && (
        <div className="card table-wrap">
          {!notifs ? <div className="center"><span className="spinner" /></div> : (
            <table>
              <thead><tr><th>Envoyé le</th><th>Canal</th><th>Destinataire</th><th>Message</th></tr></thead>
              <tbody>
                {notifs.map((n) => (
                  <tr key={n.id}>
                    <td className="mini">{dt(n.created_at)}</td>
                    <td><span className={`pill ${n.channel === 'sms' ? 'info' : 'ok'}`}>{n.channel === 'sms' ? 'SMS' : 'WhatsApp'}</span></td>
                    <td>{n.recipient_name}<div className="mini">{n.recipient_phone}</div></td>
                    <td className="mini" style={{ maxWidth: 420 }}>{n.message}</td>
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
            <table>
              <thead><tr><th>Quand</th><th>Utilisateur</th><th>Action</th><th>Entité</th><th>Détails</th><th>IP</th></tr></thead>
              <tbody>
                {audit.map((l) => (
                  <tr key={l.id}>
                    <td className="mini">{dt(l.created_at)}</td>
                    <td>{l.user_name || '—'}</td>
                    <td><b>{l.action}</b></td>
                    <td className="mini">{l.entity_type} {l.entity_id ? `#${l.entity_id}` : ''}</td>
                    <td className="mini" style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.details || '—'}</td>
                    <td className="mini">{l.ip || '—'}</td>
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
