import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';

export default function AdminClasses() {
  const [classes, setClasses] = useState(null);
  const [fees, setFees] = useState(null);
  const [clsForm, setClsForm] = useState({ name: '', level: 'Collège', annual_fee: '' });
  const [feeForm, setFeeForm] = useState({ class_id: '', label: 'Frais de rentrée', amount: '', due_date: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    api('/admin/classes').then((d) => setClasses(d.classes)).catch((e) => setError(e.message));
    api('/admin/fee-items').then((d) => setFees(d.feeItems)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const addClass = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/admin/classes', { method: 'POST', body: { ...clsForm, annual_fee: Number(clsForm.annual_fee) } });
      setMsg(`Classe ${clsForm.name} créée.`);
      setClsForm({ name: '', level: 'Collège', annual_fee: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const addFee = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/admin/fee-items', { method: 'POST', body: { ...feeForm, class_id: Number(feeForm.class_id), amount: Number(feeForm.amount) } });
      setMsg('Échéance ajoutée.');
      setFeeForm({ ...feeForm, amount: '', due_date: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  if (error && !classes) return <div className="alert error">{error}</div>;
  if (!classes) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  return (
    <>
      <h1 className="page-title">Classes & frais</h1>
      <p className="page-sub">Gestion des classes, des frais annuels et des échéances de pension.</p>

      {msg && <div className="alert ok">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Nouvelle classe</h3>
          <form onSubmit={addClass}>
            <div className="field"><label>Nom (ex : 6ème A)</label><input value={clsForm.name} onChange={(e) => setClsForm({ ...clsForm, name: e.target.value })} required /></div>
            <div className="field">
              <label>Niveau</label>
              <select value={clsForm.level} onChange={(e) => setClsForm({ ...clsForm, level: e.target.value })}>
                <option>Collège</option><option>Lycée</option><option>Primaire</option>
              </select>
            </div>
            <div className="field"><label>Frais annuels (FCFA)</label><input type="number" value={clsForm.annual_fee} onChange={(e) => setClsForm({ ...clsForm, annual_fee: e.target.value })} required /></div>
            <button className="btn primary lg">Créer la classe</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>Nouvelle échéance</h3>
          <form onSubmit={addFee}>
            <div className="field">
              <label>Classe</label>
              <select value={feeForm.class_id} onChange={(e) => setFeeForm({ ...feeForm, class_id: e.target.value })} required>
                <option value="">— Choisir —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Libellé</label>
              <select value={feeForm.label} onChange={(e) => setFeeForm({ ...feeForm, label: e.target.value })}>
                <option>Frais de rentrée</option><option>2ème tranche</option><option>3ème tranche</option><option>Frais divers</option>
              </select>
            </div>
            <div className="field"><label>Montant (FCFA)</label><input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} required /></div>
            <div className="field"><label>Date limite</label><input type="date" value={feeForm.due_date} onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })} /></div>
            <button className="btn primary lg">Ajouter l'échéance</button>
          </form>
        </div>
      </div>

      <div className="card mt table-wrap">
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>Classes existantes</h3>
        <table>
          <thead><tr><th>Classe</th><th>Niveau</th><th>Frais annuels</th><th>Année</th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}><td><b>{c.name}</b></td><td>{c.level}</td><td>{money(c.annual_fee)}</td><td>{c.academic_year}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt table-wrap">
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>Échéances par classe</h3>
        <table>
          <thead><tr><th>Classe</th><th>Échéance</th><th>Montant</th><th>Date limite</th></tr></thead>
          <tbody>
            {(fees || []).map((f) => (
              <tr key={f.id}><td>{f.class_name}</td><td><b>{f.label}</b></td><td>{money(f.amount)}</td><td>{f.due_date || '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
