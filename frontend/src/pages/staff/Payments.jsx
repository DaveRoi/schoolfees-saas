import { useEffect, useState } from 'react';
import { api, money, dt, openProtectedFile } from '../../api/client.js';

export default function StaffPayments() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api('/payments').then((d) => setPayments(d.payments)).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!payments) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const total = payments.filter((p) => p.status === 'success').reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <h1 className="page-title">Paiements</h1>
      <p className="page-sub">{payments.length} opérations — {money(total)} encaissés. Mise à jour temps réel.</p>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Date & heure</th><th>Élève</th><th>Classe</th><th>Parent</th><th>Échéance</th><th>Montant</th><th>Moyen</th><th>Statut</th><th>Reçu</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="mini">{dt(p.paid_at || p.created_at)}</td>
                <td><b>{p.first_name} {p.last_name}</b></td>
                <td>{p.class_name}</td>
                <td>{p.parent_name}</td>
                <td className="mini">{p.fee_label || '—'}</td>
                <td><b>{money(p.amount)}</b></td>
                <td>{p.method === 'mtn_momo' ? 'MTN MoMo' : p.method === 'orange_money' ? 'Orange Money' : 'Espèces'}</td>
                <td>
                  {p.status === 'success' && <span className="pill ok">Payé</span>}
                  {p.status === 'pending' && <span className="pill warn">En attente</span>}
                  {p.status === 'failed' && <span className="pill danger">Échoué</span>}
                  {p.status === 'refunded' && <span className="pill info">Remboursé</span>}
                </td>
                <td>
                  {p.status === 'success' && (
                    <button className="btn ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => openProtectedFile(`/payments/${p.id}/receipt`)}>📄</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
