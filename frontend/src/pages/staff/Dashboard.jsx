import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { api, money, dt } from '../../api/client.js';
import YearAdvanceBanner from './YearAdvanceBanner.jsx';
import { useLang } from '../../i18n.jsx';

export default function StaffDashboard() {
  const { t } = useLang();
  const [dash, setDash] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = () => api('/reports/dashboard').then(setDash).catch((e) => setError(e.message));
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!dash) return <div className="center" style={{ padding: 80 }}><span className="spinner" /></div>;

  const rate = dash.totalExpected ? Math.round((dash.totalCollected / dash.totalExpected) * 100) : 0;

  return (
    <>
      <h1 className="page-title">{t('dash.title')}</h1>
      <p className="page-sub">
        {t('dash.sub')} {dash.year?.label} — {t('dash.refresh')}.
      </p>

      {dash.yearStatus?.shouldAdvance && <YearAdvanceBanner status={dash.yearStatus} />}

      <div className="grid cols-4">
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('dash.expected')}</span><span className="kpi-icon-badge bg-blue">💰</span></div>
          <span className="kpi-value">{money(dash.totalExpected)}</span>
          <div className="kpi-footer">{dash.year?.label}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('dash.collected')}</span><span className="kpi-icon-badge bg-green">✅</span></div>
          <span className="kpi-value highlight-green">{money(dash.totalCollected)}</span>
          <div className="kpi-footer"><span className="rate-badge bg-green-light">{rate}% {t('dash.recovered')}</span></div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('dash.remaining')}</span><span className="kpi-icon-badge bg-red">⚠️</span></div>
          <span className="kpi-value highlight-orange">{money(dash.totalExpected - dash.totalCollected)}</span>
          <div className="kpi-footer">{dash.unpaidStudents.length} {t('dash.studentsWithBalance')}</div>
        </div>
        <div className="card kpi-card">
          <div className="kpi-header"><span className="kpi-title">{t('dash.month')}</span><span className="kpi-icon-badge bg-orange">📅</span></div>
          <span className="kpi-value">{money(dash.monthCollected)}</span>
          <div className="kpi-footer">{t('dash.today')} : {money(dash.todayCollected)}</div>
        </div>
      </div>

      <div className="grid cols-2 mt">
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>{t('dash.chart14')}</h3>
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
              <Tooltip formatter={(v) => [money(v), t('dash.collectedLabel')]} />
              <Area dataKey="total" stroke="#4f46e5" strokeWidth={2.5} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>{t('dash.chartClass')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dash.byClass}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => money(v)} />
              <Bar dataKey="collected" fill="#10b981" radius={[6, 6, 0, 0]} name={t('dash.collectedLabel')} />
              <Bar dataKey="expected" fill="#e2e8f0" radius={[6, 6, 0, 0]} name={t('dash.expectedLabel')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid cols-2 mt">
        <div className="card">
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>{t('dash.recent')}</h3>
          <div className="table-wrap">
            <table className="responsive-table">
              <thead><tr><th>{t('payments.when')}</th><th>{t('payments.student')}</th><th>{t('dash.parent')}</th><th>{t('parent.detail.amount')}</th></tr></thead>
              <tbody>
                {dash.recent.map((r) => (
                  <tr key={r.id}>
                    <td data-label={t('payments.when')}><span className="mini">{dt(r.paid_at)}</span></td>
                    <td data-label={t('payments.student')}><b>{r.first_name} {r.last_name}</b><div className="mini">{r.class_name}</div></td>
                    <td data-label={t('dash.parent')}>{r.parent_name}</td>
                    <td data-label={t('parent.detail.amount')}><b>{money(r.amount)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10, fontSize: 16 }}>{t('dash.unpaid')}</h3>
          <div className="table-wrap">
            <table className="responsive-table">
              <thead><tr><th>{t('payments.student')}</th><th>{t('payments.classCol')}</th><th>{t('dash.paidLabel')}</th><th>{t('dash.remainderLabel')}</th></tr></thead>
              <tbody>
                {dash.unpaidStudents.slice(0, 10).map((u) => (
                  <tr key={u.id}>
                    <td data-label={t('payments.student')}><b>{u.first_name} {u.last_name}</b></td>
                    <td data-label={t('payments.classCol')}>{u.class_name}</td>
                    <td data-label={t('dash.paidLabel')}>{money(u.paid)}</td>
                    <td data-label={t('dash.remainderLabel')} style={{ color: 'var(--danger)' }}><b>{money(u.total_due - u.paid)}</b></td>
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
