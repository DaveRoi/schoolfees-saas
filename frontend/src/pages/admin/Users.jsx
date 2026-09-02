import { useEffect, useState } from 'react';
import { api, dt } from '../../api/client.js';

const EMPTY = { email: '', password: '', full_name: '', phone: '', role: 'parent' };

export default function AdminUsers() {
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = () => api('/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message));

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/admin/users', { method: 'POST', body: form });
      setMsg(`Compte ${form.full_name} (${form.role}) créé.`);
      setForm(EMPTY);
      load();
    } catch (err) { setError(err.message); }
  };

  const erase = async (id, name) => {
    if (!window.confirm(`Anonymiser le compte de ${name} (droit à l'effacement RGPD) ?`)) return;
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' });
      setMsg(`Compte de ${name} anonymisé.`);
      load();
    } catch (err) { setError(err.message); }
  };

  if (error && !users) return <div className="alert error">{error}</div>;
  if (!users) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const ROLE_BADGE = { admin: 'danger', coordinator: 'info', director: 'warn', parent: 'ok' };

  return (
    <>
      <h1 className="page-title">Utilisateurs</h1>
      <p className="page-sub">Création des comptes staff et parents, anonymisation RGPD.</p>

      {msg && <div className="alert ok">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>Créer un compte</h3>
        <form onSubmit={submit} className="grid cols-2">
          <div className="field"><label>Nom complet</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="field">
            <label>Rôle</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="parent">Parent</option>
              <option value="coordinator">Coordinatrice</option>
              <option value="director">Directrice</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="field"><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="field"><label>Téléphone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6xx xxx xxx" /></div>
          <div className="field"><label>Mot de passe provisoire (8 min.)</label><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn primary lg">Créer le compte</button></div>
        </form>
      </div>

      <div className="card table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Rôle</th><th>MFA</th><th>Créé le</th><th>RGPD</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><b>{u.full_name}</b></td>
                <td className="mini">{u.email}</td>
                <td>{u.phone || '—'}</td>
                <td><span className={`pill ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                <td>{u.mfa_enabled ? <span className="pill ok">Activé</span> : <span className="pill warn">Non</span>}</td>
                <td className="mini">{dt(u.created_at)}</td>
                <td>
                  {u.full_name !== 'ANONYMISÉ' && (
                    <button className="btn danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => erase(u.id, u.full_name)}>Effacer</button>
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
