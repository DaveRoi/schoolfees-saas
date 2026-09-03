import { useEffect, useState } from 'react';
import { api, dt } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

const EMPTY = { email: '', password: '', full_name: '', phone: '', role: 'parent' };

export default function AdminUsers() {
  const { t } = useLang();
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
      setMsg(`${form.full_name} — ${t('admin.users.created')}`);
      setForm(EMPTY);
      load();
    } catch (err) { setError(err.message); }
  };

  const erase = async (id, name) => {
    if (!window.confirm(`${t('admin.users.anonymize')} ${name} (${t('admin.users.gdpr')}) ?`)) return;
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' });
      setMsg(`${name} — ${t('admin.users.anonymized')}`);
      load();
    } catch (err) { setError(err.message); }
  };

  const resetPassword = async (id, name) => {
    const newPwd = window.prompt(`${t('admin.users.resetPwd')} — ${name} :`);
    if (!newPwd) return;
    if (newPwd.length < 8) return setError(t('common.errorLength'));
    try {
      await api(`/admin/users/${id}/reset-password`, { method: 'POST', body: { new_password: newPwd } });
      setMsg(`${name} — ${t('admin.users.resetDone')}`);
    } catch (err) { setError(err.message); }
  };

  if (error && !users) return <div className="alert error">{error}</div>;
  if (!users) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  const ROLE_BADGE = { admin: 'danger', coordinator: 'info', director: 'warn', parent: 'ok' };

  return (
    <>
      <h1 className="page-title">{t('admin.users.title')}</h1>
      <p className="page-sub">{t('admin.users.sub')}</p>

      {msg && <div className="alert ok">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, marginBottom: 14 }}>{t('admin.users.create')}</h3>
        <form onSubmit={submit} className="grid cols-2">
          <div className="field"><label>{t('register.fullName')}</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="field">
            <label>{t('admin.users.role')}</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="parent">{t('role.parent')}</option>
              <option value="coordinator">{t('role.coordinator')}</option>
              <option value="director">{t('role.director')}</option>
              <option value="admin">{t('role.admin')}</option>
            </select>
          </div>
          <div className="field"><label>{t('login.email')}</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
          <div className="field"><label>{t('register.phone')}</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="6xx xxx xxx" /></div>
          <div className="field"><label>{t('admin.users.temporaryPwd')}</label><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={8} required /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn primary lg">{t('admin.users.createBtn')}</button></div>
        </form>
      </div>

      <div className="card table-wrap">
        <table className="responsive-table">
          <thead><tr><th>{t('register.fullName')}</th><th>{t('login.email')}</th><th>{t('register.phone')}</th><th>{t('admin.users.role')}</th><th>{t('admin.users.mfa')}</th><th>{t('admin.users.createdOn')}</th><th>{t('admin.users.gdpr')}</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label={t('register.fullName')}><b>{u.full_name}</b></td>
                <td data-label={t('login.email')}><span className="mini">{u.email}</span></td>
                <td data-label={t('register.phone')}>{u.phone || '—'}</td>
                <td data-label={t('admin.users.role')}><span className={`pill ${ROLE_BADGE[u.role]}`}>{t(`role.${u.role}`)}</span></td>
                <td data-label={t('admin.users.mfa')}>{u.mfa_enabled ? <span className="pill ok">{t('admin.users.enabled')}</span> : <span className="pill warn">{t('admin.users.no')}</span>}</td>
                <td data-label={t('admin.users.createdOn')}><span className="mini">{dt(u.created_at)}</span></td>
                <td data-label={t('admin.users.gdpr')}>
                  {u.full_name !== 'ANONYMISÉ' && (
                    <button className="btn danger sm" onClick={() => erase(u.id, u.full_name)}>{t('admin.users.erase')}</button>
                  )}
                </td>
                <td data-label="🔑">
                  {u.full_name !== 'ANONYMISÉ' && (
                    <button className="btn ghost sm" onClick={() => resetPassword(u.id, u.full_name)}>{t('admin.users.resetPwdBtn')}</button>
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
