import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money } from '../../api/client.js';

export default function ParentHome() {
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/students')
      .then((d) => setStudents(d.students))
      .catch((e) => setError(e.message));
    const t = setInterval(() => api('/students').then((d) => setStudents(d.students)).catch(() => {}), 15000);
    return () => clearInterval(t);
  }, []);

  if (error) return <div className="alert error">{error}</div>;
  if (!students) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const totals = students.reduce(
    (acc, s) => {
      const due = Number(s.annual_fee || 0);
      // payé sera recalculé côté détail ; ici estimation rapide via l'API
      return acc;
    },
    { due: 0, paid: 0 }
  );

  return (
    <>
      <h1 className="page-title">Mes enfants</h1>
      <p className="page-sub">Synchronisation en temps réel — sélectionnez un enfant pour voir sa situation et payer ses pensions.</p>

      {students.length === 0 && (
        <div className="card empty">
          Aucun enfant n'est encore rattaché à votre compte.<br />
          <b>Contactez la coordinatrice de l'établissement</b> pour effectuer le rattachement après votre inscription.
        </div>
      )}

      <div className="grid cols-3">
        {students.map((s) => (
          <KidCard key={s.id} student={s} />
        ))}
      </div>
    </>
  );
}

function KidCard({ student }) {
  const [bal, setBal] = useState(null);

  useEffect(() => {
    api(`/students/${student.id}`).then((d) => setBal(d.balance)).catch(() => {});
  }, [student.id]);

  const pct = bal ? Math.min(100, Math.round((bal.totalPaid / bal.totalDue) * 100)) : 0;

  return (
    <Link to={`/eleve/${student.id}`}>
      <div className="card kid-card">
        <div className="flex between">
          <div className="flex">
            <div className="logo-dot mtn" style={{ borderRadius: '50%', width: 44, height: 44 }}>
              {student.first_name[0]}
            </div>
            <div>
              <b style={{ fontSize: 16 }}>{student.first_name} {student.last_name}</b>
              <div className="mini">{student.class_name}</div>
            </div>
          </div>
        </div>
        <div className="mt">
          {bal ? (
            <>
              <div className="flex between mini" style={{ marginBottom: 6 }}>
                <span>Payé : <b style={{ color: 'var(--ok)' }}>{money(bal.totalPaid)}</b></span>
                <span>Reste : <b style={{ color: bal.balance > 0 ? 'var(--danger)' : 'var(--ok)' }}>{money(bal.balance)}</b></span>
              </div>
              <div className="progress"><div style={{ width: `${pct}%` }} /></div>
              <div className="mini mt" style={{ marginTop: 8 }}>
                {pct === 100 ? '✅ Scolarité entièrement réglée' : `${pct}% réglé — total attendu ${money(bal.totalDue)}`}
              </div>
            </>
          ) : (
            <span className="spinner" />
          )}
        </div>
      </div>
    </Link>
  );
}
