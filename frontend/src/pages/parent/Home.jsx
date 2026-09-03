import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, money } from '../../api/client.js';

export default function ParentHome() {
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
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  // Charge la situation financière de chaque enfant (fratrie)
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
      <h1 className="page-title">Mes enfants</h1>
      <p className="page-sub">Synchronisation en temps réel — sélectionnez un enfant pour voir sa situation et payer.</p>

      {students.length === 0 && (
        <div className="card empty-state">
          Aucun enfant n'est encore rattaché à votre compte.<br />
          <b>Contactez la coordinatrice de l'établissement</b> pour effectuer le rattachement après votre inscription.
        </div>
      )}

      {/* Onglets fratrie */}
      {students.length > 0 && (
        <div className="flex wrap" style={{ marginBottom: '1.2rem' }}>
          {students.map((s) => {
            const b = balances[s.id];
            const pct = b && b.totalDue ? Math.min(100, Math.round((b.totalPaid / b.totalDue) * 100)) : 0;
            return (
              <button
                key={s.id}
                className={`btn ${selected === s.id ? 'primary' : 'ghost'}`}
                onClick={() => setSelected(s.id)}
                style={{ flexDirection: 'column', gap: '.15rem', padding: '.7rem 1.2rem', minWidth: 150 }}
              >
                <b style={{ fontSize: '.88rem' }}>{s.first_name} {s.last_name}</b>
                <span className="mini" style={{ color: 'inherit', opacity: .75 }}>{s.class_name} · {pct}% réglé</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Fiche de l'enfant sélectionné */}
      {current && (
        <div className="grid cols-2" style={{ gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)' }}>
          {/* Carte profil + progression */}
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
                    <span className="pill">{current.birth_date || ''}</span>
                  </div>
                </div>
              </div>
            </div>

            {bal ? (
              <>
                <div className="progress-labels">
                  <span>Progression du recouvrement</span>
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
                <div className="grid cols-3" style={{ marginTop: '1rem' }}>
                  <div className="card" style={{ padding: '.9rem', background: 'var(--bg-subtle)', boxShadow: 'none' }}>
                    <span className="mini">Total pension</span>
                    <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{money(bal.totalDue)}</div>
                  </div>
                  <div className="card" style={{ padding: '.9rem', background: 'var(--success-bg)', boxShadow: 'none' }}>
                    <span className="mini">Déjà payé</span>
                    <div className="kpi-value highlight-green" style={{ fontSize: '1.1rem' }}>{money(bal.totalPaid)}</div>
                  </div>
                  <div className="card" style={{ padding: '.9rem', background: 'var(--warning-bg)', boxShadow: 'none' }}>
                    <span className="mini">Reste à payer</span>
                    <div className="kpi-value highlight-orange" style={{ fontSize: '1.1rem' }}>{money(bal.balance)}</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="center" style={{ padding: 30 }}><span className="spinner" /></div>
            )}
          </div>

          {/* Carte échéances + actions */}
          <div className="card">
            <h3 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1rem', fontWeight: 800, marginBottom: '.9rem' }}>Échéances</h3>
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
                          <div className="mini">{done ? '✅ Réglée' : `reste ${money(reste)}`}</div>
                        </div>
                      </div>
                      {!done && (
                        <button className="btn emerald sm" style={{ marginTop: '.6rem' }} onClick={() => nav(`/payer/${current.id}/${f.id}`)}>
                          Payer cette tranche ➔
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mini">Chargement des échéances…</p>
            )}
            <p className="mini mt" style={{ marginTop: '1rem' }}>
              <Link to={`/eleve/${current.id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>Voir la fiche complète →</Link>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
