import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext.jsx';
import { api, money } from '../../api/client.js';

const EMPTY_FORM = { first_name: '', last_name: '', birth_date: '', gender: 'M', class_id: '', father_name: '', mother_name: '', guardian_phone: '', guardian_phone_2: '' };

export default function StaffStudents() {
  const { user } = useAuth();
  const [students, setStudents] = useState(null);
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [parents, setParents] = useState([]);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const canEdit = ['coordinator', 'admin'].includes(user?.role);

  const load = () => api('/students').then((d) => setStudents(d.students)).catch((e) => setError(e.message));

  useEffect(() => {
    load();
    api('/admin/classes').then((d) => setClasses(d.classes)).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/students', { method: 'POST', body: { ...form, class_id: Number(form.class_id) } });
      setMsg(`Élève ${form.first_name} ${form.last_name} créé avec succès.`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = (students || []).filter(
    (s) =>
      `${s.first_name} ${s.last_name} ${s.class_name}`.toLowerCase().includes(q.toLowerCase())
  );

  if (error && !students) return <div className="alert error">{error}</div>;
  if (!students) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  return (
    <>
      <div className="flex between wrap">
        <div>
          <h1 className="page-title">Élèves</h1>
          <p className="page-sub">{students.length} élèves — recherche, suivi et ajout.</p>
        </div>
        {canEdit && <button className="btn primary" onClick={() => setShowForm(!showForm)}>+ Ajouter un élève</button>}
      </div>

      {msg && <div className="alert ok">{msg} <button className="btn ghost" style={{ padding: '2px 10px', marginLeft: 10 }} onClick={() => setMsg(null)}>×</button></div>}
      {error && <div className="alert error">{error}</div>}

      {showForm && canEdit && (
        <div className="card mt" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>Nouvel élève</h3>
          <form onSubmit={submit} className="grid cols-2">
            <div className="field"><label>Prénom</label><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></div>
            <div className="field"><label>Nom</label><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></div>
            <div className="field"><label>Date de naissance</label><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
            <div className="field">
              <label>Sexe</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">Garçon</option><option value="F">Fille</option>
              </select>
            </div>
            <div className="field">
              <label>Classe</label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
                <option value="">— Choisir —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({money(c.annual_fee)}/an)</option>)}
              </select>
            </div>
            <div className="field"><label>Nom du père</label><input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} required /></div>
            <div className="field"><label>Nom de la mère</label><input value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} required /></div>
            <div className="field"><label>Téléphone tuteur (principal)</label><input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} placeholder="6xx xxx xxx" required /></div>
            <div className="field"><label>Téléphone tuteur 2 (optionnel)</label><input value={form.guardian_phone_2} onChange={(e) => setForm({ ...form, guardian_phone_2: e.target.value })} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn primary lg">Enregistrer l'élève</button>
            </div>
          </form>
          <p className="mini mt">Après création, rattachez le(s) parent(s) via la fiche de l'élève (bouton « Rattacher un parent »).</p>
        </div>
      )}

      <div className="card">
        <div className="field" style={{ maxWidth: 380 }}>
          <input placeholder="Rechercher un élève ou une classe…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Élève</th><th>Classe</th><th>Père</th><th>Mère</th><th>Contact</th><th>Frais/an</th><th>Statut</th></tr></thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td><b>{s.first_name} {s.last_name}</b><div className="mini">{s.birth_date || ''}</div></td>
                  <td>{s.class_name}</td>
                  <td>{s.father_name || '—'}</td>
                  <td>{s.mother_name || '—'}</td>
                  <td>{s.guardian_phone}</td>
                  <td>{money(s.annual_fee)}</td>
                  <td>{s.status === 'active' ? <span className="pill ok">Actif</span> : <span className="pill info">{s.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
