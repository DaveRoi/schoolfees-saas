import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, money, dt } from '../../api/client.js';

export default function StudentDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => api(`/students/${id}`).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // temps réel
    return () => clearInterval(t);
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
          <p className="page-sub">{student.class_name} — {student.gender === 'M' ? 'Garçon' : 'Fille'} — né(e) le {student.birth_date || '—'}</p>
        </div>
        <Link to="/mes-enfants" className="btn ghost">← Mes enfants</Link>
      </div>

      <div className="grid cols-3">
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Total attendu</span><span className="kpi-icon-badge bg-blue">💰</span></div>
          <span className="kpi-value">{money(balance.totalDue)}</span>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Déjà payé</span><span className="kpi-icon-badge bg-green">✅</span></div>
          <span className="kpi-value highlight-green">{money(balance.totalPaid)}</span>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Reste à payer</span><span className={`kpi-icon-badge ${balance.balance > 0 ? 'bg-orange' : 'bg-green'}`}>{balance.balance > 0 ? '⏳' : '🎉'}</span></div>
          <span className={`kpi-value ${balance.balance > 0 ? 'highlight-orange' : 'highlight-green'}`}>{money(balance.balance)}</span>
        </div>
      </div>

      <div className="card mt">
        <div className="progress-labels">
          <span>Progression du recouvrement</span>
          <span className="progress-percent">{pct}%</span>
        </div>
        <div className="progress-bar-container">
          <div className={`progress-bar-fill ${pct < 100 ? (pct === 0 ? 'danger' : 'warning') : ''}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <h2 style={{ margin: '26px 0 12px', fontSize: 18 }}>Échéances de pension</h2>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Échéance</th><th>Date limite</th><th>Montant</th><th>Payé</th><th>Reste</th><th>Statut</th><th></th>
            </tr>
          </thead>
          <tbody>
            {balance.fees.map((f) => {
              const reste = f.amount - f.paid;
              const late = f.due_date && new Date(f.due_date) < new Date() && reste > 0;
              return (
                <tr key={f.id}>
                  <td><b>{f.label}</b></td>
                  <td>{f.due_date || '—'}</td>
                  <td>{money(f.amount)}</td>
                  <td style={{ color: 'var(--ok)' }}>{money(f.paid)}</td>
                  <td style={{ color: reste > 0 ? 'var(--danger)' : 'var(--ok)' }}>{money(reste)}</td>
                  <td>
                    {reste <= 0 ? <span className="pill ok">Réglé</span> : late ? <span className="pill danger">En retard</span> : <span className="pill warn">À payer</span>}
                  </td>
                  <td>
                    {reste > 0 && (
                      <Link className="btn primary" style={{ padding: '8px 14px' }} to={`/payer/${student.id}/${f.id}`}>
                        Payer
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
        Infos famille : père — <b>{student.father_name || '—'}</b> · mère — <b>{student.mother_name || '—'}</b> · contact : <b>{student.guardian_phone}</b>
      </p>
    </>
  );
}
