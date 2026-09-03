import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext.jsx';
import { api, money } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

const EMPTY_FORM = { first_name: '', last_name: '', birth_date: '', gender: 'M', class_id: '', father_name: '', mother_name: '', guardian_phone: '', guardian_phone_2: '' };

export default function StaffStudents() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [students, setStudents] = useState(null);
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
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
      setMsg(`${form.first_name} ${form.last_name} ${t('students.created')}`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = (students || []).filter(
    (s) => `${s.first_name} ${s.last_name} ${s.class_name}`.toLowerCase().includes(q.toLowerCase())
  );

  if (error && !students) return <div className="alert error">{error}</div>;
  if (!students) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  return (
    <>
      <div className="flex between wrap">
        <div>
          <h1 className="page-title">{t('students.title')}</h1>
          <p className="page-sub">{students.length} {t('students.sub')}</p>
        </div>
        {canEdit && <button className="btn primary" onClick={() => setShowForm(!showForm)}>{t('students.add')}</button>}
      </div>

      {msg && <div className="alert ok">{msg} <button className="btn ghost sm" style={{ marginLeft: 10 }} onClick={() => setMsg(null)}>×</button></div>}
      {error && <div className="alert error">{error}</div>}

      {showForm && canEdit && (
        <div className="card mt" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 14, fontSize: 16 }}>{t('students.new')}</h3>
          <form onSubmit={submit} className="grid cols-2">
            <div className="field"><label>{t('students.firstName')}</label><input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required /></div>
            <div className="field"><label>{t('students.lastName')}</label><input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required /></div>
            <div className="field"><label>{t('students.birthDate')}</label><input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></div>
            <div className="field">
              <label>{t('students.gender')}</label>
              <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="M">{t('students.boy')}</option><option value="F">{t('students.girl')}</option>
              </select>
            </div>
            <div className="field">
              <label>{t('students.class')}</label>
              <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
                <option value="">{t('students.choose')}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({money(c.annual_fee)}{t('students.perYear')})</option>)}
              </select>
            </div>
            <div className="field"><label>{t('students.fatherName')}</label><input value={form.father_name} onChange={(e) => setForm({ ...form, father_name: e.target.value })} required /></div>
            <div className="field"><label>{t('students.motherName')}</label><input value={form.mother_name} onChange={(e) => setForm({ ...form, mother_name: e.target.value })} required /></div>
            <div className="field"><label>{t('students.phone1')}</label><input value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} placeholder="6xx xxx xxx" required /></div>
            <div className="field"><label>{t('students.phone2')}</label><input value={form.guardian_phone_2} onChange={(e) => setForm({ ...form, guardian_phone_2: e.target.value })} /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn primary lg">{t('students.save')}</button>
            </div>
          </form>
          <p className="mini mt">{t('students.afterCreate')}</p>
        </div>
      )}

      <div className="card">
        <div className="field" style={{ maxWidth: 380 }}>
          <input placeholder={t('students.searchPh')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr><th>{t('students.title')}</th><th>{t('payments.classCol')}</th><th>{t('students.fatherName')}</th><th>{t('students.motherName')}</th><th>{t('students.contactCol')}</th><th>{t('students.feeCol')}</th><th>{t('students.statusCol')}</th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td data-label={t('students.title')}><b>{s.first_name} {s.last_name}</b><div className="mini">{s.birth_date || ''}</div></td>
                  <td data-label={t('payments.classCol')}>{s.class_name}</td>
                  <td data-label={t('students.fatherName')}>{s.father_name || '—'}</td>
                  <td data-label={t('students.motherName')}>{s.mother_name || '—'}</td>
                  <td data-label={t('students.contactCol')}>{s.guardian_phone}</td>
                  <td data-label={t('students.feeCol')}>{money(s.annual_fee)}</td>
                  <td data-label={t('students.statusCol')}>{s.status === 'active' ? <span className="pill ok">{t('common.active')}</span> : <span className="pill info">{s.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
