import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { api, money, dt } from '../../api/client.js';
import YearAdvanceBanner from './YearAdvanceBanner.jsx';

export default function StaffDashboard() {
  const [dash, setDash] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api('/reports/dashboard').then(setDash).catch((e) => setError(e.message));
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!dash) return <div className="center" style={{ padding: 80 }}><span className="spinner" /></div>;

  const rate = dash.totalExpected ? Math.round((dash.totalCollected / dash.totalExpected) * 100) : 0;

  return (
    <>
      <h1 className="page-title">Cockpit Financier</h1>
      <p className="page-sub">
        Surveillance en temps réel — année {dash.year?.label} — actualisation toutes les 15 secondes.
      </p>

      {dash.yearStatus?.shouldAdvance && <YearAdvanceBanner status={dash.yearStatus} />}

      {/* KPI grid */}
      <div className="grid cols-4">
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Budget Prévisionnel</span><span className="kpi-icon-badge bg-blue">💰</span></div>
          <span className="kpi-value">{money(dash.totalExpected)}</span>
          <div className="kpi-footer">Année {dash.year?.label}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Total Encaissé</span><span className="kpi-icon-badge bg-green">✅</span></div>
          <span className="kpi-value highlight-green">{money(dash.totalCollected)}</span>
          <div className="kpi-footer"><span className="rate-badge bg-green-light">{rate}% recouvré</span></div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Reste à Recouvrer</span><span className="kpi-icon-badge bg-red">⚠️</span></div>
          <span className="kpi-value highlight-orange">{money(dash.totalExpected - dash.totalCollected)}</span>
          <div className="kpi-footer">{dash.unpaidStudents.length} élève(s) avec solde</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">Encaissé ce mois</span><span className="kpi-icon-badge bg-orange">📅</span></div>
          <span className="kpi-value">{money(dash.monthCollected)}</span>
          <div className="kpi-footer">Aujourd'hui : {money(dash.todayCollected)}</div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid cols-2 mt">
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Encaissements — 14 derniers jours</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dash.daily}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [money(v), 'Encaissé']} />
              <Area dataKey="total" stroke="#4f46e5" strokeWidth={2.5} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Recouvrement par classe</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dash.byClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="collected" fill="#10b981" radius={[6, 6, 0, 0]} name="Encaissé" />
              <Bar dataKey="expected" fill="#e2e8f0" radius={[6, 6, 0, 0]} name="Attendu" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dernières opérations + impayés */}
      <div className="grid cols-2 mt">
        <div className="card">
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>Dernières opérations de caisse</h3>
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
          <div className="flex between" style={{ marginBottom: 10 }}>
            <h3 style={{ fontSize: 16 }}>Impayés (relance)</h3>
            <button className="btn ghost sm" onClick={() => window.open('/api/reports/export/unpaid.pdf', '_blank')} title="Export PDF via la page Rapports">📥 Export</button>
          </div>
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
