import { useEffect, useState } from 'react';
import { api, money } from '../../api/client.js';
import { useLang } from '../../i18n.jsx';

export default function AdminClasses() {
  const { t } = useLang();
  const [classes, setClasses] = useState(null);
  const [fees, setFees] = useState(null);
  const [clsForm, setClsForm] = useState({ name: '', level: '', annual_fee: '' });
  const [feeForm, setFeeForm] = useState({ class_id: '', label: '', amount: '', due_date: '' });
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
      setMsg(`${clsForm.name} — ${t('admin.classes.created')}`);
      setClsForm({ name: '', level: '', annual_fee: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  const addFee = async (e) => {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      await api('/admin/fee-items', { method: 'POST', body: { ...feeForm, class_id: Number(feeForm.class_id), amount: Number(feeForm.amount) } });
      setMsg(t('admin.classes.feeAdded'));
      setFeeForm({ ...feeForm, amount: '', due_date: '' });
      load();
    } catch (err) { setError(err.message); }
  };

  if (error && !classes) return <div className="alert error">{error}</div>;
  if (!classes) return <div className="center" style={{ padding: 60 }}><span className="spinner" /></div>;

  return (
    <>
      <h1 className="page-title">{t('admin.classes.title')}</h1>
      <p className="page-sub">{t('admin.classes.sub')}</p>

      {msg && <div className="alert ok">{msg}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>{t('admin.classes.new')}</h3>
          <form onSubmit={addClass}>
            <div className="field"><label>{t('admin.classes.name')}</label><input value={clsForm.name} onChange={(e) => setClsForm({ ...clsForm, name: e.target.value })} required /></div>
            <div className="field">
              <label>{t('admin.classes.level')}</label>
              <select value={clsForm.level} onChange={(e) => setClsForm({ ...clsForm, level: e.target.value })}>
                <option value="Primaire">{t('admin.classes.primary')}</option>
                <option value="Collège">{t('admin.classes.college')}</option>
                <option value="Lycée">{t('admin.classes.lycee')}</option>
              </select>
            </div>
            <div className="field"><label>{t('admin.classes.annualFee')}</label><input type="number" value={clsForm.annual_fee} onChange={(e) => setClsForm({ ...clsForm, annual_fee: e.target.value })} required /></div>
            <button className="btn primary lg">{t('admin.classes.createBtn')}</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ fontSize: 16, marginBottom: 14 }}>{t('admin.classes.newFee')}</h3>
          <form onSubmit={addFee}>
            <div className="field">
              <label>{t('students.class')}</label>
              <select value={feeForm.class_id} onChange={(e) => setFeeForm({ ...feeForm, class_id: e.target.value })} required>
                <option value="">{t('admin.classes.chooseClass')}</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>{t('admin.classes.label')}</label>
              <select value={feeForm.label} onChange={(e) => setFeeForm({ ...feeForm, label: e.target.value })}>
                <option value="Frais de rentrée">{t('admin.classes.fee1')}</option>
                <option value="2ème tranche">{t('admin.classes.fee2')}</option>
                <option value="3ème tranche">{t('admin.classes.fee3')}</option>
                <option value="Frais divers">{t('admin.classes.feeOther')}</option>
              </select>
            </div>
            <div className="field"><label>{t('admin.classes.amount')}</label><input type="number" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} required /></div>
            <div className="field"><label>{t('admin.classes.deadline')}</label><input type="date" value={feeForm.due_date} onChange={(e) => setFeeForm({ ...feeForm, due_date: e.target.value })} /></div>
            <button className="btn primary lg">{t('admin.classes.addFee')}</button>
          </form>
        </div>
      </div>

      <div className="card mt table-wrap">
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>{t('admin.classes.existing')}</h3>
        <table className="responsive-table">
          <thead><tr><th>{t('students.class')}</th><th>{t('admin.classes.level')}</th><th>{t('admin.classes.annualFee')}</th><th>{t('admin.classes.year')}</th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}>
                <td data-label={t('students.class')}><b>{c.name}</b></td>
                <td data-label={t('admin.classes.level')}>{c.level}</td>
                <td data-label={t('admin.classes.annualFee')}>{money(c.annual_fee)}</td>
                <td data-label={t('admin.classes.year')}>{c.academic_year}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card mt table-wrap">
        <h3 style={{ fontSize: 16, marginBottom: 10 }}>{t('admin.classes.feesByClass')}</h3>
        <table className="responsive-table">
          <thead><tr><th>{t('students.class')}</th><th>{t('payments.fee')}</th><th>{t('parent.detail.amount')}</th><th>{t('admin.classes.deadline')}</th></tr></thead>
          <tbody>
            {(fees || []).map((f) => (
              <tr key={f.id}>
                <td data-label={t('students.class')}>{f.class_name}</td>
                <td data-label={t('payments.fee')}><b>{f.label}</b></td>
                <td data-label={t('parent.detail.amount')}>{money(f.amount)}</td>
                <td data-label={t('admin.classes.deadline')}>{f.due_date || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
