import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function ParentHome() {
  const { t } = useLang();
  const [students, setStudents] = useState(null);
  const [balances, setBalances] = useState({});
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => {
    const load = () =>
      api('/students')
        .then((d) => {
          setStudents(d.students);
          setSelected((prev) => prev ?? d.students[0]?.id ?? null);
        })
        .catch((e) => setError(e.message));
    load();
    const t2 = setInterval(load, 20000);
    return () => clearInterval(t2);
  }, []);

  useEffect(() => {
    if (!students?.length) return;
    let alive = true;
    Promise.all(
      students.map((s) => api(`/students/${s.id}`).then((d) => [s.id, d.balance]).catch(() => [s.id, null]))
    ).then((entries) => {
      if (alive) setBalances(Object.fromEntries(entries));
    });
    return () => { alive = false; };
  }, [students]);

  if (error) return <div className="alert error">{error}</div>;
  if (!students) return <div className="center" style={{ padding: 80 }}><span className="spinner" /></div>;

  const current = students.find((s) => s.id === selected);
  const bal = current ? balances[current.id] : null;

  return (
    <>
      <h1 className="page-title">{t('parent.childrenTitle')}</h1>
      <p className="page-sub">{t('parent.childrenSub')}</p>

      {students.length === 0 && (
        <div className="card empty-state">{t('parent.noChildren')}</div>
      )}

      {students.length > 0 && (
        <div className="children-tabs" style={{ display: 'flex', gap: '.55rem', marginBottom: '1.2rem', overflowX: 'auto', paddingBottom: '.35rem' }}>
          {students.map((s) => {
            const b = balances[s.id];
            const pct = b && b.totalDue ? Math.min(100, Math.round((b.totalPaid / b.totalDue) * 100)) : 0;
            return (
              <button
                key={s.id}
                className={`btn ${selected === s.id ? 'primary' : 'ghost'}`}
                onClick={() => setSelected(s.id)}
                style={{ flexDirection: 'column', gap: '.15rem', padding: '.7rem 1.2rem', minWidth: 140, flexShrink: 0 }}
              >
                <b style={{ fontSize: '.88rem' }}>{s.first_name} {s.last_name}</b>
                <span className="mini" style={{ color: 'inherit', opacity: .75 }}>{s.class_name} · {pct}% {t('parent.paid')}</span>
              </button>
            );
          })}
        </div>
      )}

      {current && (
        <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
          <div className="card">
            <div className="flex between wrap" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="flex">
                <div className="door-avatar avatar-emerald" style={{ borderRadius: '50%' }}>
                  {current.gender === 'F' ? '👩‍🎓' : '👨‍🎓'}
                </div>
                <div>
                  <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.2rem', fontWeight: 800 }}>{current.first_name} {current.last_name}</h2>
                  <div className="flex" style={{ gap: '.4rem' }}>
                    <span className="pill info">{current.class_name}</span>
                  </div>
                </div>
              </div>
            </div>

            {bal ? (
              <>
                <div className="progress-labels">
                  <span>{t('parent.progress')}</span>
                  <span className="progress-percent">
                    {bal.totalDue ? Math.min(100, Math.round((bal.totalPaid / bal.totalDue) * 100)) : 0}%
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className={`progress-bar-fill ${bal.balance > 0 ? (bal.totalPaid === 0 ? 'danger' : 'warning') : ''}`}
                    style={{ width: `${bal.totalDue ? Math.min(100, (bal.totalPaid / bal.totalDue) * 100) : 0}%` }}
                  />
                </div>
                <div className="grid cols-3 compact" style={{ marginTop: '1rem' }}>
                  <div className="card" style={{ padding: '.8rem', background: 'var(--bg-subtle)', boxShadow: 'none' }}>
                    <span className="mini">{t('parent.totalDue')}</span>
                    <div className="kpi-value" style={{ fontSize: '1.05rem' }}>{money(bal.totalDue)}</div>
                  </div>
                  <div className="card" style={{ padding: '.8rem', background: 'var(--success-bg)', boxShadow: 'none' }}>
                    <span className="mini">{t('parent.totalPaid')}</span>
                    <div className="kpi-value highlight-green" style={{ fontSize: '1.05rem' }}>{money(bal.totalPaid)}</div>
                  </div>
                  <div className="card" style={{ padding: '.8rem', background: 'var(--warning-bg)', boxShadow: 'none' }}>
                    <span className="mini">{t('parent.balance')}</span>
                    <div className="kpi-value highlight-orange" style={{ fontSize: '1.05rem' }}>{money(bal.balance)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="center" style={{ padding: 30 }}><span className="spinner" /></div>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1rem', fontWeight: 800, marginBottom: '.9rem' }}>{t('parent.fees')}</h3>
            {bal?.fees?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                {bal.fees.map((f) => {
                  const reste = f.amount - f.paid;
                  const done = reste <= 0;
                  return (
                    <div key={f.id} className="card" style={{ padding: '.85rem', background: 'var(--bg-subtle)', boxShadow: 'none' }}>
                      <div className="flex between wrap" style={{ gap: '.4rem' }}>
                        <div>
                          <b style={{ fontSize: '.87rem' }}>{f.label}</b>
                          <div className="mini">{f.due_date ? `📅 ${new Date(f.due_date).toLocaleDateString('fr-FR')}` : ''}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: '.85rem' }}>{money(f.amount)}</div>
                          <div className="mini">{done ? t('parent.settled') : `${t('parent.remainder')} ${money(reste)}`}</div>
                        </div>
                      </div>
                      {!done && (
                        <button className="btn emerald sm" style={{ marginTop: '.6rem' }} onClick={() => nav(`/app/payer/${current.id}/${f.id}`)}>
                          {t('parent.payThis')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mini">{t('parent.loadingFees')}</p>
            )}
            <p className="mini" style={{ marginTop: '1rem' }}>
              <Link to={`/app/eleve/${current.id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>{t('parent.fullCard')}</Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
