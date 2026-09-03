import { useEffect, useState } from 'react';
import { useAuth } from '../../components/AuthContext.jsx';
import { api, money, openProtectedFile } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

const EMPTY_FORM = { first_name: '', last_name: '', birth_date: '', gender: 'M', class_id: '', father_name: '', mother_name: '', guardian_phone: '', guardian_phone_2: '' };
const PAGE_SIZE = 20;

export default function StaffStudents() {
  const { user } = useAuth();
  const { t } = useLang();
  const [students, setStudents] = useState(null);
  const [classes, setClasses] = useState([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [importResult, setImportResult] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null); // fiche élève (modal)

  const canEdit = ['coordinator', 'admin', 'director'].includes(user?.role);
  const canImport = ['coordinator', 'admin'].includes(user?.role);

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

  // --- Import CSV ---
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    // détache les guillemets et découpe sur ; ou ,
    const split = (line) => line.split(/;|,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, '').trim());
    const headers = split(lines[0]).map((h) => h.toLowerCase());
    return lines.slice(1).map((line) => {
      const cells = split(line);
      return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
    });
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = async () => {
      const rows = parseCSV(String(reader.result));
      if (!rows.length) return setError(t('import.badCsv'));
      try {
        const d = await api('/students/import', { method: 'POST', body: { rows } });
        setImportResult(d);
        load();
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  const filtered = (students || []).filter(
    (s) => `${s.first_name} ${s.last_name} ${s.class_name}`.toLowerCase().includes(q.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStudents = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openDetail = async (id) => {
    try {
      const d = await api(`/students/${id}/full`);
      setDetail(d);
    } catch (err) {
      setError(err.message);
    }
  };

  const linkParent = async (studentId, parentId) => {
    try {
      await api(`/students/${studentId}/link-parent`, { method: 'POST', body: { parent_id: parentId } });
      openDetail(studentId);
    } catch (err) {
      setError(err.message);
    }
  };

  const unlinkParent = async (studentId, parentId) => {
    try {
      await api(`/students/${studentId}/unlink-parent/${parentId}`, { method: 'POST', body: {} });
      openDetail(studentId);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !students) return <div className="alert error">{error}</div>;
  if (!students) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  return (
    <>
      <div className="flex between wrap">
        <div>
          <h1 className="page-title">{t('students.title')}</h1>
          <p className="page-sub">{students.length} {t('students.sub')}</p>
        </div>
        <div className="flex wrap">
          {canImport && (
            <>
              <button className="btn ghost" onClick={() => { setShowImport(!showImport); setShowForm(false); }}>{t('import.btn')}</button>
              <button className="btn primary" onClick={() => { setShowForm(!showForm); setShowImport(false); }}>{t('students.add')}</button>
            </>
          )}
        </div>
      </div>

      {msg && <div className="alert ok">{msg} <button className="btn ghost sm" style={{ marginLeft: 10 }} onClick={() => setMsg(null)}>×</button></div>}
      {error && <div className="alert error">{error}</div>}

      {/* Import CSV */}
      {showImport && canImport && (
        <div className="card mt" style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8, fontSize: 16 }}>{t('import.title')}</h3>
          <p className="mini" style={{ marginBottom: 14 }}>{t('import.sub')}</p>
          <div className="flex wrap" style={{ alignItems: 'center', gap: '.8rem' }}>
            <button type="button" className="btn ghost" onClick={() => openProtectedFile('/students/import/template.csv')}>{t('import.template')}</button>
            <label className="btn primary" style={{ cursor: 'pointer' }}>
              {t('import.choose')}
              <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
            </label>
          </div>
          {importResult && (
            <div className="alert ok mt">
              {t('import.result')
                .replace('{created}', importResult.created)
                .replace('{skipped}', importResult.skipped)
                .replace('{errors}', importResult.errors.length)}
              {importResult.errors.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary className="mini" style={{ cursor: 'pointer' }}>{t('import.errorsDetail')} ({importResult.errors.length})</summary>
                  <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 6 }}>
                    {importResult.errors.map((e, i) => (
                      <div key={i} className="mini" style={{ color: 'var(--danger)' }}>{t('import.line')} {e.line} : {e.error}</div>
                    ))}
                  </div>
                  {importResult.help?.availableClasses && (
                    <div className="mini" style={{ marginTop: 6 }}>
                      {t('import.availableClasses')} : {importResult.help.availableClasses.join(' · ')}
                    </div>
                  )}
                </details>
              )}
            </div>
          )}
        </div>
      )}

      {/* Formulaire manuel */}
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

      {/* Liste + recherche + pagination */}
      <div className="card">
        <div className="field" style={{ maxWidth: 380 }}>
          <input placeholder={t('students.searchPh')} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <div className="table-wrap">
          <table className="responsive-table">
            <thead>
              <tr><th>{t('students.title')}</th><th>{t('payments.classCol')}</th><th>{t('students.fatherName')}</th><th>{t('students.motherName')}</th><th>{t('students.contactCol')}</th><th>{t('students.feeCol')}</th><th>{t('students.statusCol')}</th></tr>
            </thead>
            <tbody>
              {pageStudents.map((s) => (
                <tr key={s.id}>
                  <td data-label={t('students.title')}>
                    <button className="linklike" onClick={() => openDetail(s.id)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontWeight: 700, textAlign: 'left' }}>
                      {s.first_name} {s.last_name}
                    </button>
                    <div className="mini">{s.birth_date || ''}</div>
                  </td>
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
        {totalPages > 1 && (
          <div className="flex between wrap" style={{ marginTop: 14, alignItems: 'center' }}>
            <span className="mini">{pageStudents.length} {t('students.showing')} {filtered.length}</span>
            <div className="flex" style={{ gap: '.4rem' }}>
              <button className="btn ghost sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>{t('students.prev')}</button>
              <span className="pill info">{t('students.page')} {safePage} / {totalPages}</span>
              <button className="btn ghost sm" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>{t('students.next')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Fiche élève (modal) */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex between" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 18 }}>{detail.student.first_name} {detail.student.last_name}</h3>
              <button className="btn ghost sm" onClick={() => setDetail(null)}>✕</button>
            </div>
            <p className="mini" style={{ marginBottom: 12 }}>{detail.student.class_name} · {detail.student.academic_year} · {detail.student.guardian_phone}</p>

            <h4 style={{ fontSize: 14, marginBottom: 8 }}>{t('students.linkedParents')}</h4>
            {detail.parents.length === 0 && <p className="mini" style={{ marginBottom: 8 }}>{t('students.noParents')}</p>}
            {detail.parents.map((p) => (
              <div key={p.id} className="flex between" style={{ padding: '.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span><b>{p.full_name}</b> <span className="mini">({p.relation})</span></span>
                {canEdit && <button className="btn danger sm" onClick={() => unlinkParent(detail.student.id, p.id)}>✕</button>}
              </div>
            ))}

            {canEdit && (
              <div className="field mt">
                <label>{t('students.linkParent')}</label>
                <select onChange={(e) => { if (e.target.value) linkParent(detail.student.id, Number(e.target.value)); }} defaultValue="">
                  <option value="">— {t('students.choose')} —</option>
                  {detail.potentialParents
                    .filter((pp) => !detail.parents.some((p) => p.id === pp.id))
                    .map((pp) => <option key={pp.id} value={pp.id}>{pp.full_name} ({pp.phone})</option>)}
                </select>
              </div>
            )}

            <h4 style={{ fontSize: 14, margin: '14px 0 8px' }}>💰 {t('parent.fees')}</h4>
            {detail.balance.fees.map((f) => {
              const reste = f.amount - f.paid;
              return (
                <div key={f.id} className="flex between" style={{ padding: '.4rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span>{f.label}</span>
                  <span className="mini">{money(f.paid)} / {money(f.amount)} {reste > 0 && <b style={{ color: 'var(--danger)' }}>· {money(reste)}</b>}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
