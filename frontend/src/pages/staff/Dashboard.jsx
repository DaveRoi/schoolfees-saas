import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { api, money, dt } from '../../api/client.js';
import YearAdvanceBanner from './YearAdvanceBanner.jsx';

export default function StaffDashboard() {
  const [dash, setDash] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api('/reports/dashboard').then(setDash).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 15000); // temps réel
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!dash) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const rate = dash.totalExpected ? Math.round((dash.totalCollected / dash.totalExpected) * 100) : 0;

  return (
    <>
      <h1 className="page-title">Tableau de bord</h1>
      <p className="page-sub">
        Vue comptable en temps réel — année {dash.year?.label} — actualisation toutes les 15 secondes.
      </p>

      {dash.yearStatus?.shouldAdvance && <YearAdvanceBanner status={dash.yearStatus} />}

      <div className="grid cols-4">
        <div className="card stat brand">
          <span className="label">Encaissé aujourd'hui</span>
          <span className="value">{money(dash.todayCollected)}</span>
        </div>
        <div className="card stat brand">
          <span className="label">Encaissé ce mois</span>
          <span className="value">{money(dash.monthCollected)}</span>
        </div>
        <div className="card stat ok">
          <span className="label">Total encaissé (année)</span>
          <span className="value">{money(dash.totalCollected)}</span>
          <span className="hint">sur {money(dash.totalExpected)} attendus ({rate}%)</span>
        </div>
        <div className="card stat warn">
          <span className="label">Élèves avec solde</span>
          <span className="value">{dash.unpaidStudents.length}</span>
          <span className="hint">impayés à recouvrer</span>
        </div>
      </div>

      <div className="grid cols-2 mt">
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Encaissements 14 derniers jours</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dash.daily}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [money(v), 'Encaissé']} />
              <Area dataKey="total" stroke="#2563eb" strokeWidth={2.5} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Recouvrement par classe</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dash.byClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8f2" />
              <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="collected" fill="#2563eb" radius={[6, 6, 0, 0]} name="Encaissé" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid cols-2 mt">
        <div className="card">
          <div className="flex between" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 16 }}>Derniers paiements</h3>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Quand</th><th>Élève</th><th>Parent</th><th>Montant</th></tr></thead>
              <tbody>
                {dash.recent.map((r) => (
                  <tr key={r.id}>
                    <td className="mini">{dt(r.paid_at)}</td>
                    <td><b>{r.first_name} {r.last_name}</b><div className="mini">{r.class_name}</div></td>
                    <td>{r.parent_name}</td>
                    <td><b>{money(r.amount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>Impayés (relance)</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Élève</th><th>Classe</th><th>Payé</th><th>Reste</th></tr></thead>
              <tbody>
                {dash.unpaidStudents.slice(0, 10).map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.first_name} {u.last_name}</b></td>
                    <td>{u.class_name}</td>
                    <td>{money(u.paid)}</td>
                    <td style={{ color: 'var(--danger)' }}><b>{money(u.total_due - u.paid)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
